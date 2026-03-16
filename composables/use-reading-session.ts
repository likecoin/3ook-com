import { useDocumentVisibility, useIdle } from '@vueuse/core'
import { HEARTBEAT_INTERVAL_MS, MAX_HEARTBEAT_DELTA_MS, MAX_SESSION_DURATION_MS } from '~/constants/analytics'

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

  const { loggedIn } = useUserSession()
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

  function resetSession() {
    sessionId = crypto.randomUUID()
    startProgress = progress.value
    pagesViewed = new Set<number | string>()
    sessionFlushed = false
    activeReadingTimeMs = 0
    ttsActiveTimeMs = 0
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

  watch(isActivelyReading, (active) => {
    if (active) {
      lastActiveTimestamp = Date.now()
    }
    else if (lastActiveTimestamp) {
      activeReadingTimeMs += Date.now() - lastActiveTimestamp
      lastActiveTimestamp = null
    }
  }, { immediate: true })

  watch(() => isTextToSpeechPlaying?.value, (playing) => {
    if (playing) {
      lastTTSTimestamp = Date.now()
    }
    else if (lastTTSTimestamp) {
      ttsActiveTimeMs += Date.now() - lastTTSTimestamp
      lastTTSTimestamp = null
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

  onMounted(() => {
    resumeHeartbeat()
  })

  watch(isTabVisible, (visible) => {
    if (!visible) {
      pauseHeartbeat()
      flushSessionBeacon()
    }
    else {
      resetSession()
      resumeHeartbeat()
    }
  })

  onBeforeUnmount(() => {
    pauseHeartbeat()
    flushSessionBeacon()
  })

  return {}
}
