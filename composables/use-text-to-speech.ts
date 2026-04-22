import { useDocumentVisibility, useEventListener, useStorage } from '@vueuse/core'
import type { CustomVoiceData, AffiliateVoiceData } from '~/shared/types/custom-voice'
import { computeTTSTextSig, decodeAffiliateVoiceId, isAffiliateVoiceId } from '~/shared/utils/tts-sig'

export const TTS_ERROR_NOT_ALLOWED = 'NotAllowedError'

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

export function parseLanguageVoice(languageVoice: string): { language: string, voiceId: string } {
  const [language = '', ...voiceIdParts] = languageVoice.split('_')
  return { language, voiceId: voiceIdParts.join('_') }
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

  function resolveVoiceTier(languageVoice: string): 'system' | 'affiliate' | 'custom' {
    if (languageVoice === 'custom') return 'custom'
    if (isAffiliateVoiceId(languageVoice)) return 'affiliate'
    return 'system'
  }

  const { isApp, isNativeBridge, appPlatform } = useAppDetection()

  const ttsSessionId = ref('')

  function buildTTSEventPayload(extras: Record<string, unknown> = {}) {
    const languageVoice = ttsLanguageVoice.value || ''
    const { voiceId } = parseLanguageVoice(languageVoice)
    return {
      nft_class_id: nftClassId,
      tts_session_id: ttsSessionId.value || undefined,
      is_liker_plus_at_event_time: !!sessionUser.value?.isLikerPlus,
      ...(ttsTrialUsage.isLoaded.value
        ? {
            cumulative_chars_used: ttsTrialUsage.charactersUsed.value,
            chars_remaining: ttsTrialUsage.charactersRemaining.value,
          }
        : {}),
      book_language: toValue(bookLanguage) || undefined,
      voice_id: voiceId || languageVoice || undefined,
      language_voice: languageVoice || undefined,
      voice_tier: resolveVoiceTier(languageVoice),
      playback_rate: effectivePlaybackRate.value,
      current_segment_index: currentTTSSegmentIndex.value,
      total_segments: ttsSegments.value.length,
      app_platform: appPlatform.value,
      is_app: isApp.value,
      ...extras,
    }
  }

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

  function logSkip(
    event: 'tts_skip_forward' | 'tts_skip_backward' | 'tts_skip_to_index',
    fromIndex: number,
    toIndex: number,
  ) {
    useLogEvent(event, buildTTSEventPayload({
      from_index: fromIndex,
      to_index: toIndex,
    }))
  }

  // Playback rate options and storage
  const ttsConfigCacheKey = computed(() =>
    [
      config.public.cacheKeyPrefix,
      TTS_CONFIG_KEY,
    ].join('-'),
  )

  const DEFAULT_PLAYBACK_RATE = 1.0

  const ttsPlaybackRateOptions = computed(() => [0.75, 0.9, DEFAULT_PLAYBACK_RATE, 1.1, 1.25, 1.5].map(rate => ({
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
  const showOfflineModal = ref(false)
  const shouldResumeWhenOnline = ref(false)
  const consecutiveAudioErrors = ref(0)
  const MAX_CONSECUTIVE_ERRORS = 3
  const currentTTSSegmentIndex = ref(0)
  const ttsSegments = ref<TTSSegment[]>([])

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

  // Wire player events
  player.on('play', () => {
    isTextToSpeechPlaying.value = true
    isTextToSpeechLoading.value = false
    const timing = consumeSegmentLoadTimer()
    if (timing && timing.index === currentTTSSegmentIndex.value) {
      useLogEvent('tts_segment_loaded', buildTTSEventPayload({
        segment_index: timing.index,
        load_time_ms: timing.loadMs,
        had_buffering: timing.hadBuffering,
        is_first_segment: timing.index === 0,
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
      isTextToSpeechLoading.value = false
      isTextToSpeechPlaying.value = false
      options.onTrialExhausted?.()
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
    if (index !== currentTTSSegmentIndex.value) {
      consecutiveAudioErrors.value = 0
    }
    isLastTrackChangeResync = !!meta?.isResync
    currentTTSSegmentIndex.value = index
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
        error: formatTTSError(error),
      }))
    }

    // Check if this is a network error (require both error code AND offline status to avoid misjudgment)
    const isNetworkError = error instanceof MediaError
      && error.code === MediaError.MEDIA_ERR_NETWORK
      && !navigator.onLine

    if (isNetworkError && hasMoreTracks()) {
      // Network issue detected, handle similar to offline event
      isOffline.value = true
      shouldResumeWhenOnline.value = true
      showOfflineModal.value = true
      pauseTextToSpeech()
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

  function handleOffline() {
    isOffline.value = true
    if (isTextToSpeechPlaying.value && hasMoreTracks()) {
      shouldResumeWhenOnline.value = true
      showOfflineModal.value = true
      pauseTextToSpeech()
    }
  }

  function handleOnline() {
    isOffline.value = false
    showOfflineModal.value = false
    if (shouldResumeWhenOnline.value && isTextToSpeechOn.value && !isTextToSpeechPlaying.value) {
      shouldResumeWhenOnline.value = false
      startTextToSpeech(currentTTSSegmentIndex.value)
    }
  }

  function forceResume() {
    showOfflineModal.value = false
    shouldResumeWhenOnline.value = false
    startTextToSpeech(currentTTSSegmentIndex.value)
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

  // Media Session (web only)
  function updatePositionState() {
    if (!('mediaSession' in navigator)) return
    const pos = player.getPosition()
    if (pos) {
      try {
        navigator.mediaSession.setPositionState({
          duration: pos.duration,
          playbackRate: effectivePlaybackRate.value,
          position: pos.position,
        })
      }
      catch {
        // Some browsers throw if duration is not finite
      }
    }
  }

  player.on('positionState', () => {
    updatePositionState()
  })

  player.on('rateForced', (rate) => {
    effectivePlaybackRate.value = rate
    updatePositionState()
  })

  function setupMediaSession() {
    if (isNativeBridge.value) return
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: toValue(bookName),
          album: toValue(bookChapterName) || toValue(bookName),
          artist: toValue(bookAuthorName),
          artwork: toValue(bookCoverSrc)
            ? [
                {
                  src: toValue(bookCoverSrc) as string,
                },
              ]
            : undefined,
        })

        navigator.mediaSession.setActionHandler('play', () => {
          startTextToSpeech()
        })

        navigator.mediaSession.setActionHandler('pause', () => {
          pauseTextToSpeech()
        })

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          skipBackward()
        })

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          skipForward()
        })

        navigator.mediaSession.setActionHandler('stop', () => {
          stopTextToSpeech()
        })

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const pos = player.getPosition()
          if (pos) {
            const offset = details.seekOffset || 10
            player.seek(pos.position - offset)
            updatePositionState()
          }
        })

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const pos = player.getPosition()
          if (pos) {
            const offset = details.seekOffset || 10
            player.seek(pos.position + offset)
            updatePositionState()
          }
        })

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            player.seek(details.seekTime)
            updatePositionState()
          }
        })
      }
    }
    catch (error) {
      console.error('Error setting up Media Session:', error)
    }
  }

  watch(isTextToSpeechPlaying, () => {
    if (!isNativeBridge.value && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isTextToSpeechPlaying.value ? 'playing' : 'paused'
    }
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

  function resolvePrivateVoiceLanguage(voiceLanguage?: string): string {
    const lang = toValue(bookLanguage) || 'zh-HK'
    return lang.toLowerCase().startsWith('en') ? 'en-US' : (voiceLanguage || 'zh-HK')
  }

  watch(ttsPlaybackRate, (newRate, oldRate) => {
    effectivePlaybackRate.value = newRate
    player.setRate(newRate)
    useLogEvent('tts_playback_rate_change', buildTTSEventPayload({
      previous_rate: oldRate,
    }))
  })

  function appendCommonParams(
    params: URLSearchParams,
    { text, voiceId, language, isPrivateVoice }: {
      text: string
      voiceId: string
      language: string
      isPrivateVoice: boolean
    },
  ) {
    params.set('nft_class_id', nftClassId)
    // System voices use an empty-token sig so URLs converge across users,
    // enabling shared Cloudflare edge caching. Private voices (custom +
    // affiliate) use a per-user ttsKey so URLs stay unique per wallet — the
    // edge cannot serve one user's cloned/exclusive voice audio to another.
    const sigToken = isPrivateVoice ? (sessionUser.value?.ttsKey || '') : ''
    params.set('sig', computeTTSTextSig({ token: sigToken, voiceId, language, nftClassId, text }))
    if (isNativeBridge.value) {
      params.set('blocking', '1')
    }
  }

  function recordOptimisticSegmentUsage(sanitizedText: string) {
    // Custom voice is gated to Plus; the server rejects non-Plus requests,
    // so counting here would drift the local trial counter.
    if (ttsLanguageVoice.value === 'custom') return
    const dedupKey = `${ttsLanguageVoice.value}:${sanitizedText}`
    ttsTrialUsage.recordOptimisticSegmentUsage(dedupKey, sanitizedText.length)
  }

  function getAudioSrc(element: TTSSegment): string {
    if (element.audioSrc) return element.audioSrc

    const sanitizedText = sanitizeTTSText(element.text)
    recordOptimisticSegmentUsage(sanitizedText)

    if (isAffiliateVoiceId(ttsLanguageVoice.value)) {
      const slot = decodeAffiliateVoiceId(ttsLanguageVoice.value)
      const voice = slot
        ? options.affiliateVoices?.value?.find(v => v.id === slot)
        : undefined
      const language = resolvePrivateVoiceLanguage(voice?.language)
      const params = new URLSearchParams({
        text: sanitizedText,
        language,
        voice_id: ttsLanguageVoice.value,
      })
      appendCommonParams(params, { text: sanitizedText, voiceId: ttsLanguageVoice.value, language, isPrivateVoice: true })
      return `/api/reader/tts?${params.toString()}`
    }

    if (ttsLanguageVoice.value === 'custom') {
      const language = resolvePrivateVoiceLanguage(options.customVoice?.value?.voiceLanguage)
      const params = new URLSearchParams({
        text: sanitizedText,
        language,
        voice_id: 'custom',
      })
      appendCommonParams(params, { text: sanitizedText, voiceId: 'custom', language, isPrivateVoice: true })
      if (options.customVoice?.value?.updatedAt) {
        params.set('_t', options.customVoice.value.updatedAt.toString())
      }
      return `/api/reader/tts?${params.toString()}`
    }

    const parsed = parseLanguageVoice(ttsLanguageVoice.value)
    const language = parsed.language || 'zh-HK'
    const voiceId = parsed.voiceId
    const params = new URLSearchParams({
      text: sanitizedText,
      language,
      voice_id: voiceId,
    })
    appendCommonParams(params, { text: sanitizedText, voiceId, language, isPrivateVoice: false })
    return `/api/reader/tts?${params.toString()}`
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

      ttsSessionId.value = crypto.randomUUID()
      useLogEvent('tts_start', buildTTSEventPayload())

      isTextToSpeechLoading.value = true
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
      })

      setupMediaSession()
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
    showOfflineModal.value = false
    shouldResumeWhenOnline.value = false
    player.stop()
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isTextToSpeechLoading.value = false
    isShowTextToSpeechOptions.value = false
    effectivePlaybackRate.value = ttsPlaybackRate.value
    ttsSessionId.value = ''

    if (!isNativeBridge.value && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
    }
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
  }
}
