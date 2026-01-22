import { useDebounceFn, useEventListener, useStorage } from '@vueuse/core'

interface TTSOptions {
  nftClassId?: string
  onError?: (error: string | Event | MediaError) => void
  onAllSegmentsPlayed?: () => void
  checkIfNeededPageChange?: (element: TTSSegment) => boolean
  bookName?: string | Ref<string> | ComputedRef<string>
  bookChapterName?: string | Ref<string> | ComputedRef<string>
  bookAuthorName?: string | Ref<string> | ComputedRef<string>
  bookCoverSrc?: string | Ref<string> | ComputedRef<string>
  bookLanguage?: string | Ref<string> | ComputedRef<string>
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
  } = useTTSVoice({ bookLanguage })

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
  const audioBuffers = ref<(HTMLAudioElement | null)[]>([null, null])
  const isOffline = ref(false)
  const showOfflineModal = ref(false)
  const shouldResumeWhenOnline = ref(false)
  const currentBufferIndex = ref<0 | 1>(0)
  const idleBufferIndex = computed<0 | 1>(() => (currentBufferIndex.value === 0 ? 1 : 0))
  const currentTTSSegmentIndex = ref(0)
  const ttsSegments = ref<TTSSegment[]>([])
  const currentTTSSegment = computed(() => {
    return ttsSegments.value[currentTTSSegmentIndex.value]
  })
  const currentTTSSegmentText = computed(() => {
    return currentTTSSegment.value?.text || ''
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

  function updateMediaSessionPlaybackState() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isTextToSpeechPlaying.value ? 'playing' : 'paused'
    }
  }

  watch (isTextToSpeechPlaying, () => {
    updateMediaSessionPlaybackState()
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
    audioBuffers.value.forEach((audio) => {
      if (audio) {
        audio.playbackRate = newRate
        audio.defaultPlaybackRate = newRate
        useLogEvent('tts_playback_rate_change', {
          nft_class_id: nftClassId,
          value: newRate,
        })
      }
    })
  })

  function pauseTextToSpeech() {
    if (isTextToSpeechOn.value) {
      stopActiveAudio()
      useLogEvent('tts_pause', {
        nft_class_id: nftClassId,
      })
    }
  }

  function createAudio(element: TTSSegment, bufferIndex: 0 | 1) {
    let audio = audioBuffers.value[bufferIndex]
    if (audio?.getAttribute('data-text') === element.text) {
      return audio
    }

    if (!audio) {
      audio = new Audio()
      audioBuffers.value[bufferIndex] = audio
      audio.preload = 'auto'

      audio.onplay = () => {
        isTextToSpeechPlaying.value = true
      }

      audio.onpause = () => {
        isTextToSpeechPlaying.value = false
      }

      audio.onended = () => {
        isTextToSpeechPlaying.value = false
        playNextElement()
      }

      audio.onstalled = () => {
        if (bufferIndex === currentBufferIndex.value && audio) {
          console.warn(`Audio playback stalled at ${ttsPlaybackRate.value}x for text: "${audio.getAttribute('data-text')}"`)
          if (audio.currentTime < 0.00001) {
            // Safari on iOS sometimes gets stuck at 0.000001 for rate > 1.0
            audio.playbackRate = 1.0
          }
        }
      }

      audio.onerror = (e) => {
        if (bufferIndex === currentBufferIndex.value) {
          const error = audio?.error || e
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
          setTimeout(() => {
            if (isTextToSpeechOn.value && isTextToSpeechPlaying.value) {
              playNextElement()
            }
          }, 1000) // Try next element after 1 second
        }
      }
    }

    if (element.audioSrc) {
      audio.src = element.audioSrc
    }
    else {
      const [language, ...voiceIdParts] = ttsLanguageVoice.value.split('_')
      const params = new URLSearchParams({
        text: element.text,
        language: language || 'zh-HK',
        voice_id: voiceIdParts.join('_') || '0',
      })
      audio.src = `/api/reader/tts?${params.toString()}`
    }

    audio.playbackRate = ttsPlaybackRate.value
    audio.defaultPlaybackRate = ttsPlaybackRate.value
    audio.setAttribute('data-text', element.text)
    audio.load()

    return audio
  }

  function playCurrentElement() {
    const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
    if (!currentElement) return

    stopActiveAudio()
    const currentAudio = createAudio(currentElement, currentBufferIndex.value)
    currentAudio.play()

    const nextElementForBuffer = ttsSegments.value[currentTTSSegmentIndex.value + 1]

    const nextBufferIndex = idleBufferIndex.value
    if (nextElementForBuffer) {
      createAudio(nextElementForBuffer, nextBufferIndex)
    }
  }

  function playNextElement() {
    if (currentTTSSegmentIndex.value + 1 >= ttsSegments.value.length) {
      options.onAllSegmentsPlayed?.()
      return
    }
    currentTTSSegmentIndex.value += 1
    playCurrentElement()
  }

  async function startTextToSpeech(index: number | null = null) {
    isShowTextToSpeechOptions.value = true
    if (!ttsLanguageVoiceValues.value.includes(ttsLanguageVoice.value)) {
      ttsLanguageVoice.value = ttsLanguageVoiceValues.value[0]
    }

    if (index !== null) {
      currentTTSSegmentIndex.value = Math.max(Math.min(index, ttsSegments.value.length - 1), 0)
    }
    else if (isTextToSpeechOn.value) {
      const activeAudio = audioBuffers.value[currentBufferIndex.value]
      if (activeAudio) {
        activeAudio.play()
        useLogEvent('tts_resume', {
          nft_class_id: nftClassId,
        })
        return
      }
    }
    else {
      currentTTSSegmentIndex.value = 0
    }

    resetAudio()
    isTextToSpeechOn.value = true
    setupMediaSession()

    useLogEvent('tts_start', {
      nft_class_id: nftClassId,
    })

    try {
      if (ttsSegments.value.length === 0) {
        return
      }
      playCurrentElement()
    }
    catch (error) {
      isTextToSpeechOn.value = false
      throw error
    }
  }

  function resetAudio() {
    currentBufferIndex.value = 0
    audioBuffers.value.forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.src = ''
        audio.load()
        audio.onplay = null
        audio.onpause = null
        audio.onended = null
        audio.onerror = null
      }
    })
    audioBuffers.value = [null, null]
  }

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  const playCurrentElementDebounced = useDebounceFn(() => {
    playCurrentElement()
  }, 500)

  function stopActiveAudio() {
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }
  }

  function skipForward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_forward', {
      nft_class_id: nftClassId,
    })
    stopActiveAudio()
    if (currentTTSSegmentIndex.value + 1 < ttsSegments.value.length) {
      currentTTSSegmentIndex.value += 1
    }
    playCurrentElementDebounced()
  }

  function skipToIndex(segmentIndex: number) {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_to_index', {
      nft_class_id: nftClassId,
    })
    stopActiveAudio()
    currentTTSSegmentIndex.value = Math.max(Math.min(segmentIndex, ttsSegments.value.length - 1), 0)
    playCurrentElementDebounced()
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
    stopActiveAudio()
    if (currentTTSSegmentIndex.value > 0) {
      currentTTSSegmentIndex.value -= 1
    }
    playCurrentElementDebounced()
  }

  function restartTextToSpeech() {
    const wasPlaying = isTextToSpeechOn.value && isTextToSpeechPlaying.value
    stopTextToSpeech()
    if (wasPlaying) {
      startTextToSpeech(currentTTSSegmentIndex.value)
    }
  }

  function stopTextToSpeech() {
    showOfflineModal.value = false
    shouldResumeWhenOnline.value = false
    resetAudio()
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
