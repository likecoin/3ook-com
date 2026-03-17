import { useEventListener, useStorage } from '@vueuse/core'
import type { CustomVoiceData } from '~/shared/types/custom-voice'
import type { TTSCantoneseModel } from '~/shared/types/user-settings'

export const TTS_ERROR_NOT_ALLOWED = 'NotAllowedError'

interface TTSOptions {
  nftClassId?: string
  onError?: (error: string | Event | MediaError) => void
  onAllSegmentsPlayed?: () => void
  bookName?: string | Ref<string> | ComputedRef<string>
  bookChapterName?: string | Ref<string> | ComputedRef<string>
  bookAuthorName?: string | Ref<string> | ComputedRef<string>
  bookCoverSrc?: string | Ref<string> | ComputedRef<string>
  bookLanguage?: string | Ref<string> | ComputedRef<string>
  customVoice?: Ref<CustomVoiceData | null>
  ttsCantoneseModel?: Ref<TTSCantoneseModel | undefined>
}

export function useTextToSpeech(options: TTSOptions = {}) {
  const {
    bookName,
    bookChapterName,
    bookAuthorName,
    bookCoverSrc,
    bookLanguage,
  } = options || {}

  const nftClassId = options.nftClassId

  const config = useRuntimeConfig()

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
  } = useTTSVoice({ bookLanguage, customVoice: options.customVoice })

  // Pick player implementation — both are created upfront (inert until load()),
  // and the proxy delegates to the correct one based on the reactive flag.
  const { isNativeBridge } = useNativeAudioBridge()
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
    on(event, handler) {
      // Register on both — the inactive player won't fire events
      nativePlayer.on(event, handler)
      webPlayer.on(event, handler)
    },
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
  })

  player.on('pause', () => {
    isTextToSpeechPlaying.value = false
  })

  player.on('ended', () => {
    consecutiveAudioErrors.value = 0
    // Set loading before clearing playing so the UI never briefly shows
    // the play button while the next segment is being fetched.
    if (hasMoreTracks()) {
      isTextToSpeechLoading.value = true
    }
    isTextToSpeechPlaying.value = false
    playNextElement()
  })

  player.on('trackChanged', (index) => {
    if (index !== currentTTSSegmentIndex.value) {
      consecutiveAudioErrors.value = 0
    }
    currentTTSSegmentIndex.value = index
  })

  player.on('allEnded', () => {
    isTextToSpeechPlaying.value = false
    useLogEvent('tts_completed', { nft_class_id: nftClassId })
    options.onAllSegmentsPlayed?.()
  })

  player.on('error', (error) => {
    isTextToSpeechLoading.value = false
    console.warn('Audio playback error:', error)

    if (error === TTS_ERROR_NOT_ALLOWED) {
      stopTextToSpeech()
      options.onError?.(error)
      return
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
      useLogEvent('tts_error', { nft_class_id: nftClassId, consecutive_errors: consecutiveAudioErrors.value })
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
      restartTextToSpeech()
      useLogEvent('tts_language_change', {
        nft_class_id: nftClassId,
      })
    }
  })

  function resolveCustomVoiceLanguage(): string {
    const lang = toValue(bookLanguage) || 'zh-HK'
    const isEnglish = lang.toLowerCase().startsWith('en')
    return isEnglish ? 'en-US' : (options.customVoice?.value?.voiceLanguage || 'zh-HK')
  }

  if (options.ttsCantoneseModel) {
    watch(options.ttsCantoneseModel, () => {
      if (ttsLanguageVoice.value.startsWith('zh-HK')) {
        restartTextToSpeech()
      }
      else if (ttsLanguageVoice.value === 'custom' && resolveCustomVoiceLanguage() === 'zh-HK') {
        restartTextToSpeech()
      }
    })
  }

  watch(ttsPlaybackRate, (newRate) => {
    effectivePlaybackRate.value = newRate
    player.setRate(newRate)
    useLogEvent('tts_playback_rate_change', {
      nft_class_id: nftClassId,
      value: newRate,
    })
  })

  function appendCantoneseModel(params: URLSearchParams, language: string) {
    if (language === 'zh-HK' && options.ttsCantoneseModel?.value) {
      params.set('minimax_model', options.ttsCantoneseModel.value)
    }
  }

  function getAudioSrc(element: TTSSegment): string {
    if (element.audioSrc) return element.audioSrc

    if (ttsLanguageVoice.value === 'custom') {
      const language = resolveCustomVoiceLanguage()
      const params = new URLSearchParams({
        text: sanitizeTTSText(element.text),
        language,
        voice_id: 'custom',
      })
      if (nftClassId) {
        params.set('nft_class_id', nftClassId)
      }
      if (options.customVoice?.value?.updatedAt) {
        params.set('_t', options.customVoice.value.updatedAt.toString())
      }
      if (isNativeBridge.value) {
        params.set('blocking', '1')
      }
      appendCantoneseModel(params, language)
      return `/api/reader/tts?${params.toString()}`
    }

    const [language, ...voiceIdParts] = ttsLanguageVoice.value.split('_')
    const params = new URLSearchParams({
      text: sanitizeTTSText(element.text),
      language: language || 'zh-HK',
      voice_id: voiceIdParts.join('_'),
    })
    if (nftClassId) {
      params.set('nft_class_id', nftClassId)
    }
    if (isNativeBridge.value) {
      params.set('blocking', '1')
    }
    appendCantoneseModel(params, language || 'zh-HK')
    return `/api/reader/tts?${params.toString()}`
  }

  function playNextElement() {
    cancelPendingSkip()
    if (currentTTSSegmentIndex.value + 1 >= ttsSegments.value.length) {
      options.onAllSegmentsPlayed?.()
      return
    }
    isTextToSpeechLoading.value = true
    currentTTSSegmentIndex.value += 1
    player.skipTo(currentTTSSegmentIndex.value)
  }

  async function startTextToSpeech(index: number | null = null) {
    if (isStartingTextToSpeech.value) return
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
          useLogEvent('tts_resume', {
            nft_class_id: nftClassId,
          })
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

      useLogEvent('tts_start', {
        nft_class_id: nftClassId,
      })

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
      isTextToSpeechLoading.value = false
      player.pause()
      useLogEvent('tts_pause', {
        nft_class_id: nftClassId,
      })
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
    useLogEvent('tts_skip_forward', {
      nft_class_id: nftClassId,
    })
    isTextToSpeechLoading.value = true
    player.pause()
    if (currentTTSSegmentIndex.value + 1 < ttsSegments.value.length) {
      currentTTSSegmentIndex.value += 1
    }
    debouncedSkipTo(currentTTSSegmentIndex.value)
  }

  function skipToIndex(segmentIndex: number) {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_to_index', {
      nft_class_id: nftClassId,
    })
    isTextToSpeechLoading.value = true
    player.pause()
    currentTTSSegmentIndex.value = Math.max(Math.min(segmentIndex, ttsSegments.value.length - 1), 0)
    debouncedSkipTo(currentTTSSegmentIndex.value)
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
    isTextToSpeechLoading.value = true
    player.pause()
    if (currentTTSSegmentIndex.value > 0) {
      currentTTSSegmentIndex.value -= 1
    }
    debouncedSkipTo(currentTTSSegmentIndex.value)
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
    showOfflineModal.value = false
    shouldResumeWhenOnline.value = false
    player.stop()
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isTextToSpeechLoading.value = false
    isShowTextToSpeechOptions.value = false
    effectivePlaybackRate.value = ttsPlaybackRate.value

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
  }
}
