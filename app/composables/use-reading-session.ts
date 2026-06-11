import { useDocumentVisibility, useIdle, useThrottleFn } from '@vueuse/core'
import { ANALYTICS_FLUSH_THROTTLE_MS, HEARTBEAT_INTERVAL_MS, MAX_HEARTBEAT_DELTA_MS, MAX_SESSION_DURATION_MS } from '~~/shared/constants/analytics'

const IDLE_TIMEOUT_MS = 2 * 60 * 1000

interface ReadingSessionOptions {
  nftClassId: string | Ref<string>
  readerType: 'epub' | 'pdf'
  progress: Ref<number>
  isTextToSpeechPlaying?: Ref<boolean>
  chapterIndex?: Ref<number | undefined>
  pageIndex?: Ref<number | undefined>
}

export function useReadingSession(options: ReadingSessionOptions) {
  const { readerType, progress, isTextToSpeechPlaying, chapterIndex, pageIndex } = options
  const nftClassId = toRef(options.nftClassId)

  const { loggedIn, user: sessionUser } = useUserSession()
  let sessionId = ''
  let startProgress = 0
  let pagesViewed = new Set<number | string>()
  let sessionFlushed = false

  let activeReadingTimeMs = 0
  let ttsActiveTimeMs = 0
  let sessionActiveReadingTimeMs = 0
  let sessionTTSActiveTimeMs = 0
  let lastActiveTimestamp: number | null = null
  let lastTTSTimestamp: number | null = null

  function resetSession({ seedTTSMs = 0 } = {}) {
    sessionId = crypto.randomUUID()
    startProgress = progress.value
    pagesViewed = new Set<number | string>()
    sessionFlushed = false
    activeReadingTimeMs = 0
    ttsActiveTimeMs = seedTTSMs
    sessionActiveReadingTimeMs = 0
    sessionTTSActiveTimeMs = 0
    lastActiveTimestamp = null
    lastTTSTimestamp = null
  }

  resetSession()
  const { idle } = useIdle(IDLE_TIMEOUT_MS, {
    events: ['scroll', 'touchstart', 'keydown', 'pointermove'],
  })
  const visibility = useDocumentVisibility()
  const isTabVisible = computed(() => visibility.value === 'visible')

  const isActivelyReading = computed(() =>
    isTabVisible.value && !idle.value,
  )

  // Commit accumulated time at natural boundaries (TTS pause/stop/close, end of a
  // reading burst). Throttled so rapid toggles collapse to one paced Firestore write.
  const flushDeltas = useThrottleFn(sendHeartbeat, ANALYTICS_FLUSH_THROTTLE_MS)

  watch(isActivelyReading, (active) => {
    if (active) {
      lastActiveTimestamp = Date.now()
    }
    else if (lastActiveTimestamp) {
      activeReadingTimeMs += Date.now() - lastActiveTimestamp
      lastActiveTimestamp = null
      // Fires on idle-while-visible or the hide transition; on hide the terminal
      // beacon flushes and a $fetch would race it, so restrict to the visible case.
      if (isTabVisible.value) flushDeltas()
    }
  }, { immediate: true })

  watch(() => isTextToSpeechPlaying?.value, (playing) => {
    if (playing) {
      lastTTSTimestamp = Date.now()
    }
    else if (lastTTSTimestamp) {
      ttsActiveTimeMs += Date.now() - lastTTSTimestamp
      lastTTSTimestamp = null
      // TTS plays in the background, so commit on pause/stop even while hidden;
      // a server flush works from a hidden-but-alive tab (beacon covers unload).
      flushDeltas()
    }
  }, { immediate: true })

  watch(() => chapterIndex?.value, (index) => {
    if (index !== undefined) {
      pagesViewed.add(`ch:${index}`)
    }
  }, { immediate: true })
  watch(() => pageIndex?.value, (index) => {
    if (index !== undefined) {
      pagesViewed.add(`pg:${index}`)
    }
  }, { immediate: true })
  watch(progress, () => {
    if (startProgress === 0 && progress.value !== 0 && sessionActiveReadingTimeMs === 0) {
      startProgress = progress.value
    }
    if (!chapterIndex && !pageIndex) {
      pagesViewed.add(Math.floor(progress.value))
    }
    // TTS advances progress in the background too, so flush regardless of
    // visibility — like the book-settings sync. Throttled; beacon covers unload.
    flushDeltas()
  }, { immediate: true })

  function drainAccumulators(cap: number) {
    const now = Date.now()
    let drainedActiveTime = activeReadingTimeMs
    let drainedTTSTime = ttsActiveTimeMs

    if (lastActiveTimestamp) {
      drainedActiveTime += now - lastActiveTimestamp
      lastActiveTimestamp = now
    }
    if (lastTTSTimestamp) {
      drainedTTSTime += now - lastTTSTimestamp
      lastTTSTimestamp = now
    }

    const capped = {
      activeReadingTimeMs: Math.min(drainedActiveTime, cap),
      ttsActiveTimeMs: Math.min(drainedTTSTime, cap),
    }

    sessionActiveReadingTimeMs += capped.activeReadingTimeMs
    sessionTTSActiveTimeMs += capped.ttsActiveTimeMs

    activeReadingTimeMs = Math.max(0, drainedActiveTime - capped.activeReadingTimeMs)
    ttsActiveTimeMs = Math.max(0, drainedTTSTime - capped.ttsActiveTimeMs)

    return capped
  }

  function buildSessionPayload() {
    const finalDelta = drainAccumulators(MAX_SESSION_DURATION_MS)
    const totalActiveReadingTimeMs = Math.min(sessionActiveReadingTimeMs, MAX_SESSION_DURATION_MS)
    const totalTTSActiveTimeMs = Math.min(sessionTTSActiveTimeMs, MAX_SESSION_DURATION_MS)
    if (totalActiveReadingTimeMs < 1000 && totalTTSActiveTimeMs < 1000) return null

    return {
      nftClassId: toValue(nftClassId),
      sessionId,
      activeReadingTimeMs: totalActiveReadingTimeMs,
      ttsActiveTimeMs: totalTTSActiveTimeMs,
      activeReadingTimeMsDelta: finalDelta.activeReadingTimeMs,
      ttsActiveTimeMsDelta: finalDelta.ttsActiveTimeMs,
      pagesViewed: pagesViewed.size,
      startProgress,
      endProgress: progress.value,
      readerType,
      chapterIndex: chapterIndex?.value,
      pageIndex: pageIndex?.value,
    }
  }

  function flushSessionBeacon() {
    if (sessionFlushed || !loggedIn.value) return
    sessionFlushed = true

    const payload = buildSessionPayload()
    if (!payload) return

    navigator.sendBeacon(
      '/api/analytics/session',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    )

    useLogEvent('reading_session_end', {
      nft_class_id: toValue(nftClassId),
      active_reading_time_ms: payload.activeReadingTimeMs,
      tts_active_time_ms: payload.ttsActiveTimeMs,
      pages_viewed: payload.pagesViewed,
      is_liker_plus_at_event_time: !!sessionUser.value?.isLikerPlus,
    })
  }

  async function sendHeartbeat() {
    if (!loggedIn.value) return

    const drained = drainAccumulators(MAX_HEARTBEAT_DELTA_MS)
    if (drained.activeReadingTimeMs < 1000 && drained.ttsActiveTimeMs < 1000) return

    try {
      await $fetch('/api/analytics/heartbeat', {
        method: 'POST',
        body: {
          nftClassId: toValue(nftClassId),
          sessionId,
          activeReadingTimeMsDelta: drained.activeReadingTimeMs,
          ttsActiveTimeMsDelta: drained.ttsActiveTimeMs,
        },
      })
    }
    catch (error) {
      console.warn('[ReadingSession] Failed to send heartbeat:', error)
    }
  }

  const { pause: pauseHeartbeat, resume: resumeHeartbeat } = useIntervalFn(sendHeartbeat, HEARTBEAT_INTERVAL_MS, { immediate: false })

  function logSessionStart() {
    if (!loggedIn.value) return
    useLogEvent('reading_session_start', {
      nft_class_id: toValue(nftClassId),
      reader_type: readerType,
    })
  }

  onMounted(() => {
    logSessionStart()
    resumeHeartbeat()
  })

  watch(isTabVisible, (visible) => {
    if (!visible) {
      pauseHeartbeat()
      flushSessionBeacon()
    }
    else {
      // Audio keeps playing while hidden, so carry that listening span into the
      // new session; resetSession() nulls the clocks and the source refs don't
      // toggle on return, so re-arm both here or they never restart.
      const now = Date.now()
      const carriedTTSMs = ttsActiveTimeMs + (lastTTSTimestamp ? now - lastTTSTimestamp : 0)
      resetSession({ seedTTSMs: carriedTTSMs })
      if (isTextToSpeechPlaying?.value) lastTTSTimestamp = now
      if (isActivelyReading.value) lastActiveTimestamp = now
      logSessionStart()
      resumeHeartbeat()
    }
  })

  onBeforeUnmount(() => {
    pauseHeartbeat()
    flushSessionBeacon()
  })

  return {}
}
