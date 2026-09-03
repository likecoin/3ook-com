import { useDocumentVisibility, useEventListener, useStorage } from '@vueuse/core'
import type { CustomVoiceData, AffiliateVoiceData } from '~~/shared/types/custom-voice'
import { buildID3v2Tag } from '~~/shared/utils/id3'
import { getSafeFilenameSlug } from '~~/shared/utils/filename'

export const TTS_ERROR_NOT_ALLOWED = 'NotAllowedError'

// ~4 minutes of runway at the observed 13s median segment. Sized against real
// stalls, 99% of which recover inside 4 minutes and three quarters inside 2
// seconds; a deeper window mostly buys unheard synthesis. Each player clamps it.
const TTS_PREFETCH_COUNT = 20

// How long the prefetch flag may stay unresolved before it counts as off.
// PostHog loads lazily and can be blocked outright, so a start that races the
// resolution pays this once at most, and only when it opens the player early.
const TTS_PREFETCH_FLAG_TIMEOUT_MS = 1500

// Why a session got the depth it did, reported on tts_start. Without it a
// depth of 1 reads the same whether the account is free, the shell can't
// prefetch, or the flag is off.
type TTSPrefetchGate = 'ok' | 'not_plus' | 'no_capability' | 'flag_off'

// Segments that must be local before a dropout is ridden out rather than
// surfaced. Below this the runway is shorter than the stall detection that
// follows, so playing on only buys the listener the same modal, half a minute later.
const TTS_MIN_WARM_RUNWAY = 3

const MEDIA_ERROR_NAMES: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
}

export function formatTTSError(error: string | Event | MediaError): string {
  if (typeof error === 'string') return error
  if (error instanceof MediaError) {
    const name = MEDIA_ERROR_NAMES[error.code] || `MEDIA_ERR_${error.code}`
    const message = error.message?.trim()
    return message ? `${name}: ${message}` : name
  }
  if (error instanceof Event) return error.type || 'event'
  return 'unknown'
}

interface TTSOptions {
  nftClassId: string
  onError?: (error: string | Event | MediaError) => void
  onAllSegmentsPlayed?: () => void
  onTrialExhausted?: () => void
  bookName?: string | Ref<string> | ComputedRef<string>
  bookChapterName?: string | Ref<string> | ComputedRef<string>
  bookAuthorName?: string | Ref<string> | ComputedRef<string>
  bookCoverSrc?: string | Ref<string> | ComputedRef<string>
  bookLanguage?: string | Ref<string> | ComputedRef<string>
  customVoice?: Ref<CustomVoiceData | null>
  affiliateVoices?: Ref<AffiliateVoiceData[]> | ComputedRef<AffiliateVoiceData[]>
  isLibraryBook?: MaybeRefOrGetter<boolean>
}

export function useTextToSpeech(options: TTSOptions) {
  const {
    bookName,
    bookChapterName,
    bookAuthorName,
    bookCoverSrc,
    bookLanguage,
  } = options || {}

  const nftClassId = options.nftClassId

  const { user: sessionUser } = useUserSession()

  const config = useRuntimeConfig()

  const ttsTrialUsage = useTTSTrialUsage()

  const {
    offlinePinIds,
    isDownloading: isDownloadingOfflineTTS,
    downloadProgress: offlineTTSDownloadProgress,
    downloadTTS,
    removeOfflineTTS: removeOfflineTTSPins,
    sweepTTSAudioCache,
  } = useOfflineTTS()

  // Book+voice already swept this session, so a resume doesn't re-walk the cache.
  let sweptPinId: string | undefined

  // Use the TTS voice composable
  const {
    isBookEnglish,
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    activeTTSLanguageVoiceLabel,
    ttsLanguageVoiceOptionsWithAvatars,
    ttsLanguageVoiceValues,
    setTTSLanguageVoice,
  } = useTTSVoice({
    bookLanguage,
    customVoice: options.customVoice,
    affiliateVoices: options.affiliateVoices,
  })

  const { isNativeBridge } = useAppDetection()

  const { isPlusOrDevicePlus } = useDevicePlusEntitlement()
  // Separate flags: the two lanes stage against different limits — backend
  // synthesis load for the app, browser storage for the web.
  // Resolved once here, not per start: both players latch the depth at load()
  // and never revisit it, so a flag arriving a tick late would otherwise strand
  // the session at depth 1 — and a play tap awaits a settled promise instead of
  // dropping out of its gesture, which iOS needs to let audio start.
  const prefetchFlagPromise = fetchFeatureFlagEnabled(
    isNativeBridge.value ? 'app-tts-deep-prefetch' : 'web-tts-deep-prefetch',
    { timeoutMs: TTS_PREFETCH_FLAG_TIMEOUT_MS },
  )
  // Kill switch for offline listening on mainnet. Testnet ignores it so
  // internal testing is never blocked on the flag resolving, or on PostHog
  // being reachable at all.
  const isOfflineTTSFlagEnabled = useFeatureFlagEnabled('tts-offline-download')

  // Only accounts with no daily TTS quota fill a runway: a free-trial user's
  // whole allowance is ~19 segments, which prefetch would spend unheard.
  async function resolveTTSPrefetchGate(): Promise<TTSPrefetchGate> {
    if (!isPlusOrDevicePlus.value) return 'not_plus'
    if (isNativeBridge.value && !isNativeFeatureSupported('deepPrefetch')) return 'no_capability'
    return await prefetchFlagPromise ? 'ok' : 'flag_off'
  }

  const ttsSessionId = ref('')

  // Both players are created upfront (inert until load()); the proxy below
  // delegates to the correct one based on the reactive isNativeBridge flag.
  const nativePlayer = useNativeAudioPlayer(isNativeBridge)
  const webPlayer = useWebAudioPlayer()
  const activePlayer = () => isNativeBridge.value ? nativePlayer : webPlayer
  const player: TTSAudioPlayer = {
    load: options => activePlayer().load(options),
    resume: () => activePlayer().resume(),
    pause: () => activePlayer().pause(),
    stop: () => activePlayer().stop(),
    skipTo: index => activePlayer().skipTo(index),
    setRate: rate => activePlayer().setRate(rate),
    seek: time => activePlayer().seek(time),
    getPosition: () => activePlayer().getPosition(),
    wasInterruptedByBackground: () => activePlayer().wasInterruptedByBackground(),
    getCurrentURL: () => activePlayer().getCurrentURL(),
    getWarmRunway: () => activePlayer().getWarmRunway(),
    on(event, handler) {
      // Register on both — the inactive player won't fire events
      nativePlayer.on(event, handler)
      webPlayer.on(event, handler)
    },
  }

  function getPositionMs() {
    const pos = player.getPosition()
    return pos ? Math.round(pos.position * 1000) : undefined
  }

  // Playback rate options and storage
  const ttsConfigCacheKey = computed(() => getTTSConfigCacheKey(config.public.cacheKeyPrefix))

  const DEFAULT_PLAYBACK_RATE = 1.0

  const ttsPlaybackRateOptions = computed(() => [0.9, DEFAULT_PLAYBACK_RATE, 1.1, 1.25, 1.5].map(rate => ({
    label: `${rate}x`,
    value: rate,
  })))

  const ttsPlaybackRate = useStorage(getTTSConfigKeyWithSuffix(ttsConfigCacheKey.value, 'playback-rate'), DEFAULT_PLAYBACK_RATE)
  // Effective rate tracks what the player is actually using (may differ from user preference
  // when Safari forces a downgrade on stall). Used for UI display and Media Session.
  const effectivePlaybackRate = ref(ttsPlaybackRate.value)
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
  const isTextToSpeechLoading = ref(false)
  const isStartingTextToSpeech = ref(false)
  const isOffline = ref(false)
  const shouldResumeWhenOnline = ref(false)
  // Timestamp the offline modal was raised, so resolution can report how long
  // it blocked playback. Null when no modal is open; it is the single source of
  // truth for the modal's visibility below.
  const offlineModalShownAt = ref<number | null>(null)
  const showOfflineModal = computed(() => offlineModalShownAt.value !== null)
  const consecutiveAudioErrors = ref(0)
  const MAX_CONSECUTIVE_ERRORS = 3
  const currentTTSSegmentIndex = ref(0)
  const ttsSegments = ref<TTSSegment[]>([])

  const { buildTTSEventPayload, logSkip } = useTTSAnalytics({
    nftClassId,
    ttsSessionId,
    ttsLanguageVoice,
    effectivePlaybackRate,
    currentTTSSegmentIndex,
    ttsSegments,
    bookLanguage,
    isLibraryBook: options.isLibraryBook,
  })

  // hadBuffering survives past play, so it can't be derived from
  // isTextToSpeechLoading (which play resets before we read the timer).
  let segmentLoadStart: { index: number, startedAt: number, hadBuffering: boolean } | null = null

  function startSegmentLoadTimer(index: number) {
    segmentLoadStart = {
      index,
      startedAt: performance.now(),
      hadBuffering: false,
    }
  }

  function markSegmentBuffering(index: number) {
    if (segmentLoadStart?.index === index) {
      segmentLoadStart.hadBuffering = true
    }
  }

  function consumeSegmentLoadTimer() {
    if (!segmentLoadStart) return null
    const loadMs = Math.round(performance.now() - segmentLoadStart.startedAt)
    const snapshot = { ...segmentLoadStart, loadMs }
    segmentLoadStart = null
    return snapshot
  }

  function clearSegmentLoadTimer() {
    segmentLoadStart = null
  }

  const currentTTSSegment = computed(() => {
    return ttsSegments.value[currentTTSSegmentIndex.value]
  })
  const currentTTSSegmentText = computed(() => {
    return currentTTSSegment.value?.text || ''
  })

  function resolveCacheStatus() {
    if (isNativeBridge.value) return 'native' as const
    return classifyTTSCacheStatus(player.getCurrentURL())
  }

  // Cost bucket for this segment load: browser_cache / cdn_or_storage are
  // cheap, generated means a Minimax call. Native shell owns its own audio
  // pipeline, so the source is opaque from the WebView.
  function resolveAudioSource() {
    if (isNativeBridge.value) return 'native' as const
    return classifyTTSAudioSource(player.getCurrentURL())
  }

  // Stop playback UI state and route the user into the trial wall.
  function handleTrialExhaustedStop() {
    isTextToSpeechLoading.value = false
    isTextToSpeechPlaying.value = false
    options.onTrialExhausted?.()
  }

  // Wire player events
  player.on('play', () => {
    isTextToSpeechPlaying.value = true
    isTextToSpeechLoading.value = false
    const timing = consumeSegmentLoadTimer()
    // The shell reports the same segment as `audio_segment`,
    // and tts_start/tts_completed already carry every session-constant field.
    // Reporting both bills one segment twice for no extra read.
    if (!isNativeBridge.value && timing && timing.index === currentTTSSegmentIndex.value) {
      useLogEvent('tts_segment_loaded', buildTTSEventPayload({
        segment_index: timing.index,
        load_time_ms: timing.loadMs,
        had_buffering: timing.hadBuffering,
        is_first_segment: timing.index === 0,
        // Segments playable with no network at the moment this one started.
        // Separates a worker-served stall from a real starve, and is the only
        // read on whether TTS_PREFETCH_COUNT is sized right.
        warm_runway: player.getWarmRunway(),
        cache_status: resolveCacheStatus(),
        audio_source: resolveAudioSource(),
      }))
    }
  })

  player.on('buffering', () => {
    isTextToSpeechLoading.value = true
    markSegmentBuffering(currentTTSSegmentIndex.value)
  })

  player.on('pause', () => {
    isTextToSpeechPlaying.value = false
    clearSegmentLoadTimer()
  })

  player.on('ended', () => {
    consecutiveAudioErrors.value = 0
    if (hasMoreTracks() && ttsTrialUsage.isExhausted.value) {
      handleTrialExhaustedStop()
      return
    }
    // Set loading before clearing playing so the UI never briefly shows
    // the play button while the next segment is being fetched.
    if (hasMoreTracks()) {
      isTextToSpeechLoading.value = true
    }
    isTextToSpeechPlaying.value = false
    playNextElement()
  })

  let isLastTrackChangeResync = false
  function consumeTrackChangeResync(): boolean {
    const value = isLastTrackChangeResync
    isLastTrackChangeResync = false
    return value
  }

  player.on('trackChanged', (index, meta) => {
    const isResync = !!meta?.isResync
    // The native engine plays the whole queue itself, auto-advancing via
    // `trackChanged` instead of the per-segment `ended` the trial gate hooks.
    // Enforce the wall here so an exhausted non-Plus user can't play past it.
    if (!isResync && index > currentTTSSegmentIndex.value && ttsTrialUsage.isExhausted.value) {
      handleTrialExhaustedStop()
      return
    }
    if (index !== currentTTSSegmentIndex.value) {
      consecutiveAudioErrors.value = 0
    }
    isLastTrackChangeResync = isResync
    currentTTSSegmentIndex.value = index
    // Resyncs count too: events sent while the WebView was suspended are
    // dropped, so a foreground resync is the only record of background playback.
    recordSegmentPlaybackUsage(index)
    startSegmentLoadTimer(index)
  })

  player.on('allEnded', () => {
    isTextToSpeechPlaying.value = false
    isTextToSpeechLoading.value = false
    useLogEvent('tts_completed', buildTTSEventPayload())
    options.onAllSegmentsPlayed?.()
  })

  player.on('error', (error) => {
    isTextToSpeechLoading.value = false
    console.warn('Audio playback error:', error)

    if (error === TTS_ERROR_NOT_ALLOWED) {
      // Autoplay blocked is not a load failure — skip the analytics event
      // but still clear the timer so a subsequent real error isn't measured
      // against this one's start time.
      clearSegmentLoadTimer()
      stopTextToSpeech()
      options.onError?.(error)
      return
    }

    const timing = consumeSegmentLoadTimer()
    if (timing && timing.index === currentTTSSegmentIndex.value) {
      useLogEvent('tts_segment_load_failed', buildTTSEventPayload({
        segment_index: timing.index,
        load_time_ms: timing.loadMs,
        had_buffering: timing.hadBuffering,
        is_first_segment: timing.index === 0,
        warm_runway: player.getWarmRunway(),
        error: formatTTSError(error),
        cache_status: resolveCacheStatus(),
        audio_source: resolveAudioSource(),
      }))
    }

    // Whatever the error code, being offline is the diagnosis: a retry can't
    // reach the network, and the skip further down would only cost the listener
    // their place in the book. Halt and wait, as for a connectivity event.
    if (!navigator.onLine && hasMoreTracks()) {
      haltForOffline('network_error')
      return
    }

    consecutiveAudioErrors.value += 1

    // On first error, silently retry the current segment before escalating.
    // Transient network issues (e.g. ERR_CONNECTION_CLOSED) often manifest as
    // MEDIA_ERR_SRC_NOT_SUPPORTED and resolve on retry.
    if (consecutiveAudioErrors.value <= 1) {
      setTimeout(() => {
        if (isTextToSpeechOn.value) {
          player.skipTo(currentTTSSegmentIndex.value)
        }
      }, 1000)
      return
    }

    options.onError?.(error)
    if (consecutiveAudioErrors.value >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(`TTS paused after ${MAX_CONSECUTIVE_ERRORS} consecutive audio errors`)
      useLogEvent('tts_error', buildTTSEventPayload({ consecutive_errors: consecutiveAudioErrors.value }))
      pauseTextToSpeech()
      return
    }
    setTimeout(() => {
      if (isTextToSpeechOn.value) {
        playNextElement()
      }
    }, 1000)
  })

  function hasMoreTracks(): boolean {
    return currentTTSSegmentIndex.value + 1 < ttsSegments.value.length
  }

  // Raise the offline modal and log an impression, deduping re-entry so a
  // network error firing on top of an 'offline' event doesn't double-count.
  // Persist a durable breadcrumb so an abandon-while-offline (the live event is
  // then lost) can be reported on next launch — see tts-offline-modal.
  function showOfflineModalWithLog(trigger: TTSOfflineModalTrigger) {
    if (offlineModalShownAt.value !== null) return
    const shownAt = Date.now()
    offlineModalShownAt.value = shownAt
    const payload = buildTTSEventPayload()
    setPendingOfflineModal({ shownAt, payload })
    useLogEvent('tts_offline_modal_shown', {
      ...payload,
      trigger,
      position_ms: getPositionMs(),
      is_online: navigator.onLine,
    })
  }

  // Dismiss the offline modal and, if it was actually shown, log how it ended.
  // The shownAt guard keeps normal stops (no modal) from logging a resolution.
  function resolveOfflineModal(outcome: Exclude<TTSOfflineModalOutcome, 'abandoned'>) {
    const shownAt = offlineModalShownAt.value
    if (shownAt === null) return
    offlineModalShownAt.value = null
    clearPendingOfflineModal()
    useLogEvent('tts_offline_modal_resolved', buildTTSEventPayload({
      outcome,
      duration_ms: Date.now() - shownAt,
      is_online: navigator.onLine,
    }))
  }

  // Stop on a dropout and wait for the network, rather than burning through
  // segments that are all equally unreachable.
  function haltForOffline(trigger: TTSOfflineModalTrigger) {
    isOffline.value = true
    shouldResumeWhenOnline.value = true
    showOfflineModalWithLog(trigger)
    pauseTextToSpeech()
  }

  function handleOffline() {
    isOffline.value = true
    if (!isTextToSpeechPlaying.value || !hasMoreTracks()) return
    // Losing the network is not losing the audio: with a runway already local,
    // play on and let a real stall raise the modal instead.
    if (player.getWarmRunway() >= TTS_MIN_WARM_RUNWAY) return
    haltForOffline('offline_event')
  }

  // Both resume paths come through here so a dropout never restarts the book:
  // omitting the index resumes in place, but only while the session is still
  // on — otherwise startTextToSpeech would begin again from segment zero.
  function resumeAfterOffline() {
    shouldResumeWhenOnline.value = false
    startTextToSpeech(isTextToSpeechOn.value ? null : currentTTSSegmentIndex.value)
  }

  function handleOnline() {
    isOffline.value = false
    resolveOfflineModal('reconnected')
    if (shouldResumeWhenOnline.value && isTextToSpeechOn.value && !isTextToSpeechPlaying.value) {
      resumeAfterOffline()
    }
  }

  function forceResume() {
    resolveOfflineModal('manual_resume')
    resumeAfterOffline()
  }

  // Set up network listeners with automatic cleanup via useEventListener
  useEventListener(window, 'offline', handleOffline)
  useEventListener(window, 'online', handleOnline)

  // Recover from browser-imposed background pauses on return. The
  // wasInterruptedByBackground() gate is required because pauseTextToSpeech()
  // leaves isTextToSpeechOn=true, so without it we'd resume a user pause.
  const documentVisibility = useDocumentVisibility()
  watch(documentVisibility, (state) => {
    if (state !== 'visible') return
    if (!isTextToSpeechOn.value || isTextToSpeechPlaying.value) return
    if (!player.wasInterruptedByBackground()) return
    player.resume()
  })

  onMounted(() => {
    isOffline.value = !navigator.onLine
  })

  onScopeDispose(() => cancelPendingSkip())

  const {
    updatePositionState,
    throttledUpdatePositionState,
    setupMediaSession,
    clearMediaSessionPlaybackState,
  } = useTTSMediaSession({
    isNativeBridge,
    effectivePlaybackRate,
    isTextToSpeechPlaying,
    bookName,
    bookChapterName,
    bookAuthorName,
    bookCoverSrc,
    player,
    onPlay: () => startTextToSpeech(),
    onPause: () => pauseTextToSpeech(),
    onStop: () => stopTextToSpeech(),
    onPreviousTrack: () => skipBackward(),
    onNextTrack: () => skipForward(),
  })

  player.on('positionState', throttledUpdatePositionState)

  player.on('rateForced', (rate) => {
    effectivePlaybackRate.value = rate
    updatePositionState()
  })

  watch(ttsLanguageVoice, (newLanguage, oldLanguage) => {
    if (newLanguage !== oldLanguage) {
      const payload = buildTTSEventPayload({
        from_voice: oldLanguage || undefined,
        to_voice: newLanguage || undefined,
      })
      restartTextToSpeech()
      useLogEvent('tts_language_change', payload)
    }
  })

  watch(ttsPlaybackRate, (newRate, oldRate) => {
    effectivePlaybackRate.value = newRate
    player.setRate(newRate)
    useLogEvent('tts_playback_rate_change', buildTTSEventPayload({
      previous_rate: oldRate,
    }))
  })

  // Bill on playback, not on URL construction: `getAudioSrc` also runs on web
  // preload and on native queue build, both ahead of what the user hears.
  function recordSegmentPlaybackUsage(index: number) {
    const segment = ttsSegments.value[index]
    if (!segment || segment.audioSrc) return
    // Custom voice is gated to Plus; the server rejects non-Plus requests,
    // so counting here would drift the local trial counter.
    if (ttsLanguageVoice.value === 'custom') return
    const sanitizedText = sanitizeTTSText(segment.text)
    const dedupKey = `${ttsLanguageVoice.value}:${sanitizedText}`
    ttsTrialUsage.recordOptimisticSegmentUsage(dedupKey, sanitizedText.length)
  }

  function getAudioSrc(element: TTSSegment, srcOptions?: { blocking?: boolean }): string {
    if (element.audioSrc) return element.audioSrc

    const sanitizedText = sanitizeTTSText(element.text)

    return buildTTSAudioURL(sanitizedText, {
      nftClassId,
      languageVoice: ttsLanguageVoice.value,
      bookLanguage: toValue(bookLanguage),
      ttsKey: sessionUser.value?.ttsKey,
      isBlocking: isNativeBridge.value || !!srcOptions?.blocking,
      affiliateVoices: options.affiliateVoices?.value,
      customVoice: options.customVoice?.value,
    })
  }

  /**
   * The cache pin this book+voice writes into, read off a real segment URL:
   * custom and affiliate voice ids carry no language, so `ttsLanguageVoice`
   * alone cannot name the pin the service worker will key on.
   */
  const ttsPinId = computed(() => {
    const firstSegment = ttsSegments.value[0]
    return firstSegment ? getTTSPinIdFromURL(getAudioSrc(firstSegment)) : undefined
  })

  const hasOfflineTTS = computed(() => !!ttsPinId.value && offlinePinIds.value.has(ttsPinId.value))

  // CacheStorage is the whole mechanism, and without a pin there is nothing to
  // name what a download would be keyed on.
  const isOfflineTTSSupported = computed(() =>
    import.meta.client && !!window.caches && !!ttsPinId.value,
  )

  // Capability and entitlement kept apart: the budget sweep below runs off
  // `isOfflineTTSSupported` regardless, since the player's lookahead fills the
  // same cache whether or not anyone can download into it.
  const isOfflineTTSEnabled = computed(() =>
    isOfflineTTSSupported.value && (config.public.isTestnet || !!isOfflineTTSFlagEnabled.value),
  )

  /**
   * Plus only, because a trial allowance is around nineteen segments — a book
   * download would spend all of it and fail the rest of the way. An already
   * downloaded book stays removable after a subscription lapses, but not after
   * the flag goes off: a kill switch has to take the whole feature with it, and
   * the budget sweep still bounds whatever audio it leaves behind. The coverage
   * walk below rides on the same gate, so a free user pays nothing for it.
   */
  const isOfflineTTSDownloadable = computed(() =>
    isOfflineTTSEnabled.value && (isPlusOrDevicePlus.value || hasOfflineTTS.value),
  )

  /**
   * What a download would still have to fetch. The pin only says a download was
   * registered, and it is registered even when the loop was cancelled part-way,
   * so without this a 5% download presents as a finished one and then goes
   * silent offline. Counted over distinct URLs: two segments sharing text (a
   * repeated heading, a refrain) are one cache entry, and subtracting them from
   * the segment count would leave a book permanently short of complete.
   */
  const offlineTTSMissingCount = ref(0)

  /**
   * Segments a full pass could not generate. The server rejects them the same
   * way every time, so they can never land and must not hold the state at
   * "partial" for good. Cleared with the pin, below.
   */
  const offlineTTSUnavailableCount = ref(0)

  async function refreshOfflineTTSCoverage() {
    const pinId = ttsPinId.value
    if (!isOfflineTTSDownloadable.value || !ttsSegments.value.length) {
      offlineTTSMissingCount.value = 0
      return
    }
    const urls = [...new Set(ttsSegments.value.map(segment => getAudioSrc(segment)))]
    const cachedURLs = await getCachedTTSSegmentURLs(urls)
    // A voice switch part-way through this walk would land the old voice's
    // count on the new pin.
    if (ttsPinId.value !== pinId) return
    offlineTTSMissingCount.value = urls.length - cachedURLs.size
  }

  // `offlinePinIds` is replaced wholesale by every download, removal and sweep,
  // so it stands in for "the cache moved under us" — including a sweep that
  // evicted the audio ordinary listening had put there.
  watch(
    [ttsPinId, ttsSegments, offlinePinIds, isOfflineTTSDownloadable],
    () => { void refreshOfflineTTSCoverage() },
    { immediate: true },
  )

  const isOfflineTTSPartial = computed(() =>
    hasOfflineTTS.value && offlineTTSMissingCount.value > offlineTTSUnavailableCount.value,
  )

  const offlineTTSState = computed(() => {
    if (isDownloadingOfflineTTS.value) return 'downloading'
    if (isOfflineTTSPartial.value) return 'partial'
    if (hasOfflineTTS.value) return 'downloaded'
    return 'idle'
  })

  // Sized off what a download would still have to fetch, which is what the user
  // waits for; the budget check is sized off the whole book instead.
  const offlineTTSPendingBytes = computed(() =>
    offlineTTSMissingCount.value * TTS_SEGMENT_ESTIMATE_BYTES,
  )

  /** No point starting a download the sweep could never keep whole. */
  const isOfflineTTSTooLarge = computed(() =>
    ttsSegments.value.length * TTS_SEGMENT_ESTIMATE_BYTES > TTS_AUDIO_CACHE_MAX_BYTES,
  )

  const offlineTTSDownloadPercentage = computed(() => {
    const progress = offlineTTSDownloadProgress.value
    if (!progress?.total) return 0
    return Math.round((progress.completed / progress.total) * 100)
  })

  let offlineTTSDownloadController: AbortController | null = null

  function cancelOfflineTTSDownload() {
    offlineTTSDownloadController?.abort()
  }

  // The loop reads getAudioSrc per segment, so a voice change part-way through
  // would fetch the rest under a different pin and then record those bytes
  // against this one. Watched rather than hooked into the voice selector, which
  // is not the only thing that reassigns the voice.
  watch(ttsPinId, () => {
    cancelOfflineTTSDownload()
    offlineTTSUnavailableCount.value = 0
  })

  // Closing the player disposes this scope; without this the loop keeps
  // fetching a book nobody is listening to and leaves the pin in flight.
  onScopeDispose(cancelOfflineTTSDownload)

  /** Returns what landed, or undefined when there was nothing to do. */
  async function downloadOfflineTTS() {
    const pinId = ttsPinId.value
    if (!pinId || !ttsSegments.value.length) return undefined
    const controller = new AbortController()
    offlineTTSDownloadController = controller
    try {
      const result = await downloadTTS({
        pinId,
        segments: ttsSegments.value,
        getAudioSrc,
        signal: controller.signal,
        // Yield to the playhead: a download racing the segment playback is
        // waiting on only turns into a stall the listener hears.
        shouldPause: () => isTextToSpeechLoading.value,
      })
      const isCancelled = controller.signal.aborted
      if (!isCancelled) offlineTTSUnavailableCount.value = result.failed
      // No explicit coverage refresh: downloadTTS replaces `offlinePinIds` on
      // its way out, and the watch above picks that up.
      return { ...result, isCancelled }
    }
    finally {
      offlineTTSDownloadController = null
    }
  }

  async function removeOfflineTTS() {
    const pinId = ttsPinId.value
    if (!pinId) return
    await removeOfflineTTSPins([pinId])
  }

  /**
   * Concatenate the book's cached segments into one MP3. Testnet-only, and
   * gated on a completed download by its caller — this reads the cache, it
   * never synthesises, so anything not downloaded is simply absent.
   *
   * Each segment is a complete MP3 and may carry its own Xing/Info VBR header,
   * so some players read the duration off the first one and seek badly. The
   * batch export script has the same property; audio itself is unaffected.
   */
  async function exportOfflineTTS() {
    const segments = ttsSegments.value
    if (!segments.length) return undefined
    const cached = await readTTSSegmentAudio(segments.map(segment => getAudioSrc(segment)))
    const frames = cached.filter((frame): frame is Uint8Array => !!frame)
    if (!frames.length) return undefined

    // The player holds the whole book's segments, so this file is the book,
    // not the chapter that happens to be playing.
    const title = toValue(bookName) || ''
    // One tag for the whole file: a per-segment tag would litter ID3 headers
    // through the middle of it.
    const tag = buildID3v2Tag({
      title,
      artist: activeTTSLanguageVoiceLabel.value,
      comment: `3ook.com TTS — ${toValue(bookName) || ''}`,
    })
    return {
      // Handed to Blob as parts: it copies them into its own store either way,
      // and concatenating first would add a second copy of the whole book.
      blob: new Blob([tag, ...frames], { type: 'audio/mpeg' }),
      filename: `${getSafeFilenameSlug(title, { fallback: 'book' })}.mp3`,
      missing: segments.length - frames.length,
    }
  }

  function playNextElement() {
    cancelPendingSkip()
    if (currentTTSSegmentIndex.value + 1 >= ttsSegments.value.length) {
      return
    }
    isTextToSpeechLoading.value = true
    currentTTSSegmentIndex.value += 1
    player.skipTo(currentTTSSegmentIndex.value)
  }

  async function startTextToSpeech(index: number | null = null) {
    if (isStartingTextToSpeech.value) return
    if (ttsTrialUsage.isExhausted.value) {
      options.onTrialExhausted?.()
      return
    }
    isStartingTextToSpeech.value = true

    try {
      isShowTextToSpeechOptions.value = true
      if (!ttsLanguageVoiceValues.value.includes(ttsLanguageVoice.value)) {
        ttsLanguageVoice.value = ttsLanguageVoiceValues.value[0]
      }

      if (index !== null) {
        currentTTSSegmentIndex.value = Math.max(Math.min(index, ttsSegments.value.length - 1), 0)
      }
      // No index resumes in place, keeping the position and the ttsSessionId —
      // an index reloads the segment from zero as a fresh session, which splits
      // one listening session in two every time a dropout recovers.
      else if (isTextToSpeechOn.value) {
        if (player.resume()) {
          useLogEvent('tts_resume', buildTTSEventPayload({
            position_ms: getPositionMs(),
          }))
          return
        }
      }
      else {
        currentTTSSegmentIndex.value = 0
      }

      if (ttsSegments.value.length === 0) {
        return
      }

      consecutiveAudioErrors.value = 0
      isTextToSpeechOn.value = true

      const sessionId = crypto.randomUUID()
      ttsSessionId.value = sessionId
      isTextToSpeechLoading.value = true

      const prefetchGate = await resolveTTSPrefetchGate()
      // A stop or a restart while the gate resolved retired this session —
      // loading now would play audio the listener already dismissed.
      if (ttsSessionId.value !== sessionId) {
        isTextToSpeechLoading.value = false
        return
      }
      // Nothing left to read: this session still owns the state, so clear it
      // rather than leaving the player switched on with no audio to load.
      if (!ttsSegments.value.length) {
        stopTextToSpeech()
        return
      }

      const prefetchCount = prefetchGate === 'ok' ? TTS_PREFETCH_COUNT : 1
      useLogEvent('tts_start', buildTTSEventPayload({
        prefetch_count: prefetchCount,
        prefetch_gate: prefetchGate,
      }))

      player.load({
        segments: ttsSegments.value,
        getAudioSrc,
        startIndex: currentTTSSegmentIndex.value,
        rate: ttsPlaybackRate.value,
        metadata: {
          bookTitle: toValue(bookName) || '',
          authorName: toValue(bookAuthorName) || '',
          coverUrl: toValue(bookCoverSrc) || '',
        },
        prefetchCount,
        ttsSessionId: ttsSessionId.value,
      })

      setupMediaSession()

      // The lookahead this session is about to write has no expiry of its own, so
      // a listener who never downloads still needs the budget enforced. Once per
      // book+voice: startTextToSpeech also runs on every resume, media-session
      // play and voice change, and each sweep walks the whole audio cache.
      const pinId = ttsPinId.value
      if (pinId && pinId !== sweptPinId) {
        sweptPinId = pinId
        void sweepTTSAudioCache(pinId)
      }
    }
    catch (error) {
      isTextToSpeechOn.value = false
      throw error
    }
    finally {
      isStartingTextToSpeech.value = false
    }
  }

  function pauseTextToSpeech() {
    if (isTextToSpeechOn.value) {
      const positionMs = getPositionMs()
      isTextToSpeechLoading.value = false
      player.pause()
      useLogEvent('tts_pause', buildTTSEventPayload({
        position_ms: positionMs,
      }))
    }
  }

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  let skipTimer: ReturnType<typeof setTimeout> | null = null

  function cancelPendingSkip() {
    if (skipTimer) {
      clearTimeout(skipTimer)
      skipTimer = null
    }
  }

  function debouncedSkipTo(index: number) {
    cancelPendingSkip()
    skipTimer = setTimeout(() => {
      skipTimer = null
      if (!isTextToSpeechOn.value) return
      player.skipTo(index)
    }, 500)
  }

  function skipForward() {
    if (!isTextToSpeechOn.value) return
    if (ttsTrialUsage.isExhausted.value) {
      options.onTrialExhausted?.()
      return
    }
    const fromIndex = currentTTSSegmentIndex.value
    const toIndex = Math.max(Math.min(fromIndex + 1, ttsSegments.value.length - 1), 0)
    logSkip('tts_skip_forward', fromIndex, toIndex)
    isTextToSpeechLoading.value = true
    player.pause()
    currentTTSSegmentIndex.value = toIndex
    debouncedSkipTo(toIndex)
  }

  function skipToIndex(segmentIndex: number) {
    if (!isTextToSpeechOn.value) return
    if (ttsTrialUsage.isExhausted.value && segmentIndex > currentTTSSegmentIndex.value) {
      options.onTrialExhausted?.()
      return
    }
    const fromIndex = currentTTSSegmentIndex.value
    const toIndex = Math.max(Math.min(segmentIndex, ttsSegments.value.length - 1), 0)
    logSkip('tts_skip_to_index', fromIndex, toIndex)
    isTextToSpeechLoading.value = true
    player.pause()
    currentTTSSegmentIndex.value = toIndex
    debouncedSkipTo(toIndex)
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    const fromIndex = currentTTSSegmentIndex.value
    const toIndex = Math.max(fromIndex - 1, 0)
    logSkip('tts_skip_backward', fromIndex, toIndex)
    isTextToSpeechLoading.value = true
    player.pause()
    currentTTSSegmentIndex.value = toIndex
    debouncedSkipTo(toIndex)
  }

  function restartTextToSpeech() {
    const wasPlaying = isTextToSpeechOn.value && isTextToSpeechPlaying.value
    const currentIndex = currentTTSSegmentIndex.value
    stopTextToSpeech()
    if (wasPlaying) {
      startTextToSpeech(currentIndex)
    }
  }

  function stopTextToSpeech() {
    cancelPendingSkip()
    clearSegmentLoadTimer()
    resolveOfflineModal('stopped')
    shouldResumeWhenOnline.value = false
    player.stop()
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isTextToSpeechLoading.value = false
    isShowTextToSpeechOptions.value = false
    effectivePlaybackRate.value = ttsPlaybackRate.value
    ttsSessionId.value = ''

    clearMediaSessionPlaybackState()
  }

  function cyclePlaybackRate() {
    const currentIndex = ttsPlaybackRateOptions.value.findIndex(option => option.value === ttsPlaybackRate.value)
    const optionsCount = ttsPlaybackRateOptions.value.length
    ttsPlaybackRate.value = ttsPlaybackRateOptions.value[(currentIndex + 1) % optionsCount]?.value || DEFAULT_PLAYBACK_RATE
    return ttsPlaybackRate.value
  }

  return {
    // Voice-related properties (from useTTSVoice)
    isBookEnglish,
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    activeTTSLanguageVoiceLabel,
    ttsLanguageVoiceOptionsWithAvatars,
    ttsPlaybackRateOptions,
    ttsPlaybackRate,
    effectivePlaybackRate,
    setTTSLanguageVoice,
    // Player-related properties
    isShowTextToSpeechOptions,
    isTextToSpeechOn,
    isTextToSpeechPlaying,
    isTextToSpeechLoading,
    showOfflineModal,
    currentTTSSegment,
    currentTTSSegmentText,
    currentTTSSegmentIndex,
    consumeTrackChangeResync,
    pauseTextToSpeech,
    startTextToSpeech,
    setTTSSegments,
    skipForward,
    skipToIndex,
    skipBackward,
    restartTextToSpeech,
    stopTextToSpeech,
    cyclePlaybackRate,
    forceResume,
    buildTTSEventPayload,
    // Offline listening
    hasOfflineTTS,
    isOfflineTTSDownloadable,
    isOfflineTTSTooLarge,
    offlineTTSState,
    offlineTTSMissingCount,
    offlineTTSPendingBytes,
    isOfflineTTSEnabled,
    isDownloadingOfflineTTS,
    offlineTTSDownloadPercentage,
    downloadOfflineTTS,
    cancelOfflineTTSDownload,
    removeOfflineTTS,
    exportOfflineTTS,
  }
}
