interface TTSSegment {
  id: string
  text: string
}

interface TTSOptions {
  nftClassId?: string
  onPlay?: (element: TTSSegment) => void
  onEnd?: (element: TTSSegment) => void
  onError?: (error: Event) => void
  onPageChange?: (direction?: number) => void
  checkIfNeededPageChange?: (element: TTSSegment) => boolean
}

export function useTextToSpeech(options: TTSOptions = {}) {
  const { user } = useUserSession()
  const subscription = useSubscription()

  const nftClassId = options.nftClassId
  const ttsLanguageVoiceOptions = [
    { label: '粵0', value: 'zh-HK_0' },
    { label: '粵1', value: 'zh-HK_1' },
    { label: '國0', value: 'zh-TW_0' },
    { label: '國1', value: 'zh-TW_1' },
    { label: 'En0', value: 'en-US_0' },
    { label: 'En1', value: 'en-US_1' },
  ]
  const ttsPlaybackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => ({
    label: `${rate}x`,
    value: rate,
  }))

  const ttsLanguageVoice = ref('zh-HK_0') // Default voice
  const ttsPlaybackRate = ref(1.0)
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
        const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
        if (currentElement) {
          options.onPlay?.(currentElement)
        }
      }

      audio.onended = () => {
        const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
        if (currentElement) {
          options.onEnd?.(currentElement)
        }
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

    const nextElement = ttsSegments.value[currentTTSSegmentIndex.value]
    if (!nextElement) {
      options.onPageChange?.()
      return
    }

    if (options.checkIfNeededPageChange && options.checkIfNeededPageChange(nextElement)) {
      options.onPageChange?.()
    }

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

  async function startTextToSpeech() {
    if (!user.value?.isLikerPlus) {
      subscription.openPaywallModal()
      return
    }

    isShowTextToSpeechOptions.value = true

    if (isTextToSpeechOn.value && !isTextToSpeechPlaying.value && !isPendingResetOnStart.value) {
      isTextToSpeechPlaying.value = true
      const activeAudio = audioBuffers.value[currentBufferIndex.value]
      if (activeAudio) {
        activeAudio.play()
        useLogEvent('tts_resume', {
          nft_class_id: nftClassId,
        })
      }
      return
    }

    resetAudio()
    currentTTSSegmentIndex.value = 0
    currentBufferIndex.value = 0
    isTextToSpeechOn.value = true

    useLogEvent('tts_start', {
      nft_class_id: nftClassId,
    })

    try {
      if (ttsSegments.value.length === 0) {
        options.onPageChange?.()
        return
      }

      const firstElement = ttsSegments.value[0]
      const secondElement = ttsSegments.value[1]

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
    audioBuffers.value.forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio.src = ''
      }
    })
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
    if (currentTTSSegment.value) options.onEnd?.(currentTTSSegment.value)
    playNextElement()
  }

  function skipBackward() {
    if (!isTextToSpeechOn.value) return
    useLogEvent('tts_skip_backward', {
      nft_class_id: nftClassId,
    })
    const activeAudio = audioBuffers.value[currentBufferIndex.value]
    activeAudio?.pause()
    if (currentTTSSegment.value) options.onEnd?.(currentTTSSegment.value)
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
    else {
      options.onPageChange?.(-1)
    }
  }

  function restartTextToSpeech() {
    if (isTextToSpeechOn.value && isTextToSpeechPlaying.value) {
      resetAudio()
      startTextToSpeech()
    }
    else {
      isPendingResetOnStart.value = true
    }
  }

  function stopTextToSpeech() {
    if (currentAudioTimeout.value) {
      clearTimeout(currentAudioTimeout.value)
      currentAudioTimeout.value = null
    }
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
    isTextToSpeechOn.value = false
    isTextToSpeechPlaying.value = false
    isShowTextToSpeechOptions.value = false
    currentTTSSegmentIndex.value = 0
    currentBufferIndex.value = 0
  }

  return {
    ttsLanguageVoiceOptions,
    ttsLanguageVoice,
    ttsPlaybackRateOptions,
    ttsPlaybackRate,
    isShowTextToSpeechOptions,
    isTextToSpeechOn,
    isTextToSpeechPlaying,
    currentTTSSegmentText,
    pauseTextToSpeech,
    startTextToSpeech,
    setTTSSegments,
    skipForward,
    skipBackward,
    restartTextToSpeech,
    stopTextToSpeech,
  }
}
