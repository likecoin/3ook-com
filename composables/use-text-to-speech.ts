import { useDebounceFn, useEventListener, useStorage } from '@vueuse/core'
import type { CustomVoiceData } from '~/shared/types/custom-voice'

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
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    activeTTSLanguageVoiceLabel,
    ttsLanguageVoiceOptionsWithAvatars,
    ttsLanguageVoiceValues,
    setTTSLanguageVoice,
  } = useTTSVoice({ bookLanguage, customVoice: options.customVoice })

  // Audio player
  const player: TTSAudioPlayer = useWebAudioPlayer()

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
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
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
  })

  player.on('pause', () => {
    isTextToSpeechPlaying.value = false
  })

  player.on('ended', () => {
    isTextToSpeechPlaying.value = false
    consecutiveAudioErrors.value = 0
    playNextElement()
  })

  player.on('trackChanged', (index) => {
    currentTTSSegmentIndex.value = index
    consecutiveAudioErrors.value = 0
  })

  player.on('allEnded', () => {
    isTextToSpeechPlaying.value = false
    options.onAllSegmentsPlayed?.()
  })

  player.on('error', (error) => {
    console.warn('Audio playback error:', error)

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

    options.onError?.(error)
    consecutiveAudioErrors.value += 1
    if (consecutiveAudioErrors.value >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(`TTS paused after ${MAX_CONSECUTIVE_ERRORS} consecutive audio errors`)
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

  function setupMediaSession() {
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
      }
    }
    catch (error) {
      console.error('Error setting up Media Session:', error)
    }
  }

  watch(isTextToSpeechPlaying, () => {
    if ('mediaSession' in navigator) {
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

  watch(ttsPlaybackRate, (newRate) => {
    player.setRate(newRate)
    useLogEvent('tts_playback_rate_change', {
      nft_class_id: nftClassId,
      value: newRate,
    })
  })

  function getAudioSrc(element: TTSSegment): string {
    if (element.audioSrc) return element.audioSrc

    if (ttsLanguageVoice.value === 'custom') {
      const lang = toValue(bookLanguage) || 'zh-HK'
      const isEnglish = lang.toLowerCase().startsWith('en')
      const customVoice = options.customVoice?.value
      const language = isEnglish ? 'en-US' : (customVoice?.voiceLanguage || 'zh-HK')
      const params = new URLSearchParams({
        text: sanitizeTTSText(element.text),
        language,
        voice_id: 'custom',
      })
      if (customVoice?.updatedAt) {
        params.set('_t', customVoice.updatedAt.toString())
      }
      return `/api/reader/tts?${params.toString()}`
    }

    const [language, ...voiceIdParts] = ttsLanguageVoice.value.split('_')
    const params = new URLSearchParams({
      text: sanitizeTTSText(element.text),
      language: language || 'zh-HK',
      voice_id: voiceIdParts.join('_') || '0',
    })
    return `/api/reader/tts?${params.toString()}`
  }

  function playNextElement() {
    if (currentTTSSegmentIndex.value + 1 >= ttsSegments.value.length) {
      options.onAllSegmentsPlayed?.()
      return
    }
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

      consecutiveAudioErrors.value = 0
      isTextToSpeechOn.value = true

      useLogEvent('tts_start', {
        nft_class_id: nftClassId,
      })

      if (ttsSegments.value.length === 0) {
        return
      }

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
      player.pause()
      useLogEvent('tts_pause', {
        nft_class_id: nftClassId,
      })
    }
  }

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  const debouncedSkipTo = useDebounceFn((index: number) => {
    player.skipTo(index)
  }, 500)

  function skipForward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_forward', {
      nft_class_id: nftClassId,
    })
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
    player.pause()
    currentTTSSegmentIndex.value = Math.max(Math.min(segmentIndex, ttsSegments.value.length - 1), 0)
    debouncedSkipTo(currentTTSSegmentIndex.value)
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
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
    showOfflineModal.value = false
    shouldResumeWhenOnline.value = false
    player.stop()
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isShowTextToSpeechOptions.value = false

    if ('mediaSession' in navigator) {
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
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    activeTTSLanguageVoiceLabel,
    ttsLanguageVoiceOptionsWithAvatars,
    ttsPlaybackRateOptions,
    ttsPlaybackRate,
    setTTSLanguageVoice,
    // Player-related properties
    isShowTextToSpeechOptions,
    isTextToSpeechOn,
    isTextToSpeechPlaying,
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
