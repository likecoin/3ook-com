import { useDebounceFn, isIOS, useStorage } from '@vueuse/core'

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

  const { $pwa } = useNuxtApp()
  const { t: $t } = useI18n()
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

  const ttsPlaybackRateOptions = computed(() => [0.75, 0.9, 1.0, 1.1, 1.25, 1.5].map(rate => ({
    label: rate === 1.0 ? $t('reader_text_to_speech_normal_speed') : `${rate}x`,
    value: rate,
  })))

  const ttsPlaybackRate = useStorage(getTTSConfigKeyWithSuffix(ttsConfigCacheKey.value, 'playback-rate'), 1.0)
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
  const isPendingResetOnStart = ref(false)
  const audioBuffers = ref<(HTMLAudioElement | null)[]>([null, null])
  const currentBufferIndex = ref<0 | 1>(0)
  const currentTTSSegmentIndex = ref(0)
  const ttsSegments = ref<TTSSegment[]>([])
  const currentTTSSegment = computed(() => {
    return ttsSegments.value[currentTTSSegmentIndex.value]
  })
  const currentTTSSegmentText = computed(() => {
    return currentTTSSegment.value?.text || ''
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
        useLogEvent('tts_playback_rate_change', {
          nft_class_id: nftClassId,
          value: newRate,
        })
      }
    })
  })

  function pauseTextToSpeech() {
    if (isTextToSpeechOn.value) {
      const activeAudio = audioBuffers.value[currentBufferIndex.value]
      activeAudio?.pause()
      isTextToSpeechPlaying.value = false
      updateMediaSessionPlaybackState()
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

      audio.onplay = () => {
        isTextToSpeechPlaying.value = true
        updateMediaSessionPlaybackState()
      }

      audio.onended = () => {
        playNextElement()
      }

      audio.onerror = (e) => {
        const error = audio?.error || e
        console.warn('Audio playback error:', error)
        options.onError?.(error)
        setTimeout(() => {
          if (isTextToSpeechOn.value && isTextToSpeechPlaying.value) {
            playNextElement()
          }
        }, 1000) // Try next element after 1 second
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
    audio.setAttribute('data-text', element.text)

    return audio
  }

  function playCurrentElement() {
    const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
    if (!currentElement) return

    // Double buffer breaks background audio playback in iOS PWA
    // Only switch buffers when NOT running as an installed iOS PWA
    if (!isIOS || !$pwa?.isPWAInstalled) {
      currentBufferIndex.value = currentBufferIndex.value === 0 ? 1 : 0
    }

    const currentAudio = createAudio(currentElement, currentBufferIndex.value)
    currentAudio.play()

    const nextElementForBuffer = ttsSegments.value[currentTTSSegmentIndex.value + 1]

    const nextBufferIndex = currentBufferIndex.value === 0 ? 1 : 0
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
    if (!ttsLanguageVoiceValues.includes(ttsLanguageVoice.value)) {
      ttsLanguageVoice.value = ttsLanguageVoiceValues[0]
    }
    isShowTextToSpeechOptions.value = true
    if (index !== null) {
      currentTTSSegmentIndex.value = Math.max(Math.min(index, ttsSegments.value.length - 1), 0)
    }

    if (isTextToSpeechOn.value && !isTextToSpeechPlaying.value && !isPendingResetOnStart.value) {
      isTextToSpeechPlaying.value = true
      updateMediaSessionPlaybackState()
      const activeAudio = audioBuffers.value[currentBufferIndex.value]
      if (activeAudio) {
        activeAudio.play()
        useLogEvent('tts_resume', {
          nft_class_id: nftClassId,
        })
        return
      }
    }

    if (index == null) {
      currentTTSSegmentIndex.value = 0
    }
    resetAudio()

    isTextToSpeechOn.value = true
    isTextToSpeechPlaying.value = true
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

  function skipForward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_forward', {
      nft_class_id: nftClassId,
    })
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }

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
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }

    currentTTSSegmentIndex.value = Math.max(Math.min(segmentIndex, ttsSegments.value.length - 1), 0)
    playCurrentElementDebounced()
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }

    if (currentTTSSegmentIndex.value > 0) {
      currentTTSSegmentIndex.value -= 1
    }
    playCurrentElementDebounced()
  }

  function restartTextToSpeech() {
    if (isTextToSpeechOn.value && isTextToSpeechPlaying.value) {
      resetAudio()
      startTextToSpeech(currentTTSSegmentIndex.value)
    }
    else {
      isPendingResetOnStart.value = true
    }
  }

  function stopTextToSpeech() {
    resetAudio()
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isShowTextToSpeechOptions.value = false

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
    }
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
  }
}
