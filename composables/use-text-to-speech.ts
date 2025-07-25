import { useStorage } from '@vueuse/core'

interface TTSOptions {
  nftClassId?: string
  onError?: (error: Event) => void
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
  // hardcoded voice options for now
  const ttsLanguageVoiceOptions = [
    { label: 'Phoebe - 粵語女聲', value: 'zh-HK_phoebe' },
    { label: '粵語男聲', value: 'zh-HK_1' },
    { label: '雷庭音 - 國語女聲', value: 'zh-TW_0' },
    { label: '國語男聲', value: 'zh-TW_1' },
    { label: 'English female', value: 'en-US_0' },
    { label: 'English male', value: 'en-US_1' },
  ]

  const availableTTSLanguageVoiceOptions = computed(() => {
    const language = toValue(bookLanguage)
    if (language) {
      if (language.toLowerCase().startsWith('zh')) {
        return ttsLanguageVoiceOptions.filter(option => option.value.startsWith('zh'))
      }
      if (language.toLowerCase().startsWith('en')) {
        return ttsLanguageVoiceOptions.filter(option => option.value.startsWith('en'))
      }
    }
    return ttsLanguageVoiceOptions
  })

  const ttsLanguageVoiceValues = availableTTSLanguageVoiceOptions.value.map(option => option.value)
  const ttsPlaybackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => ({
    label: `${rate}x`,
    value: rate,
  }))

  const ttsLanguageVoice = useStorage('reader-tts-voice', ttsLanguageVoiceValues[0] as string)
  const ttsPlaybackRate = useStorage('reader-tts-playback-rate', 1.0)
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
  const isPendingResetOnStart = ref(false)
  const audioBuffers = ref<(HTMLAudioElement | null)[]>([null, null])
  const currentAudioTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
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
        console.warn('Audio playback error:', e)
        if (e instanceof Event) {
          options.onError?.(e)
        }
      }
    }

    const params = new URLSearchParams({
      text: element.text,
      language: ttsLanguageVoice.value.split('_')[0] || 'zh-HK',
      voice_id: ttsLanguageVoice.value.split('_')[1] || '0',
    })
    audio.src = `/api/reader/tts?${params.toString()}`
    audio.playbackRate = ttsPlaybackRate.value

    return audio
  }

  function playNextElement() {
    currentTTSSegmentIndex.value += 1

    const nextElementForBuffer = ttsSegments.value[currentTTSSegmentIndex.value + 1]

    if (nextElementForBuffer) {
      createAudio(nextElementForBuffer, currentBufferIndex.value)
    }

    currentBufferIndex.value = currentBufferIndex.value === 0 ? 1 : 0
    const nextAudio = audioBuffers.value[currentBufferIndex.value]

    if (currentAudioTimeout.value) clearTimeout(currentAudioTimeout.value)
    currentAudioTimeout.value = setTimeout(() => {
      nextAudio?.play()
    }, 200)
  }

  async function startTextToSpeech(index: number | null = null) {
    if (!ttsLanguageVoiceValues.includes(ttsLanguageVoice.value)) {
      ttsLanguageVoice.value = ttsLanguageVoiceValues[0]
    }
    isShowTextToSpeechOptions.value = true
    if (index !== null) {
      currentTTSSegmentIndex.value = index
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

      const firstElement = ttsSegments.value[currentTTSSegmentIndex.value]
      const secondElement = ttsSegments.value[currentTTSSegmentIndex.value + 1]

      if (firstElement) {
        createAudio(firstElement, 0)
      }

      if (secondElement) {
        createAudio(secondElement, 1)
      }

      audioBuffers.value[currentBufferIndex.value]?.play()
    }
    catch (error) {
      isTextToSpeechOn.value = false
      throw error
    }
  }

  function resetAudio() {
    if (currentAudioTimeout.value) {
      clearTimeout(currentAudioTimeout.value)
      currentAudioTimeout.value = null
    }
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

  function skipForward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_forward', {
      nft_class_id: nftClassId,
    })
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    activeAudio?.pause()
    playNextElement()
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    activeAudio?.pause()

    if (currentTTSSegmentIndex.value > 0) {
      currentTTSSegmentIndex.value -= 1
      currentBufferIndex.value = currentBufferIndex.value === 0 ? 1 : 0
      const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
      if (currentElement) {
        createAudio(currentElement, currentBufferIndex.value)
      }
      if (isTextToSpeechPlaying.value) {
        audioBuffers.value[currentBufferIndex.value]?.play()
      }
    }
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
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    ttsPlaybackRateOptions,
    ttsPlaybackRate,
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
    skipBackward,
    restartTextToSpeech,
    stopTextToSpeech,
  }
}
