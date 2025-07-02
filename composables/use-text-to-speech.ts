interface TextContentElement {
  id: string
  text: string
}

interface TTSOptions {
  nftClassId?: string
  onPlay?: (element: TextContentElement) => void
  onEnd?: (element: TextContentElement) => void
  onError?: (error: Event) => void
  onPageChange?: () => void
  checkIfNeededPageChange?: (element: TextContentElement) => boolean
}

export function useTextToSpeech(options: TTSOptions = {}) {
  const { user } = useUserSession()
  const subscription = useSubscription()

  const nftClassId = options.nftClassId
  const ttsLanguageVoiceOptions = [
    { label: '粵0', value: { language: 'zh-HK', voiceId: '0' } },
    { label: '粵1', value: { language: 'zh-HK', voiceId: '1' } },
    { label: '國0', value: { language: 'zh-TW', voiceId: '0' } },
    { label: '國1', value: { language: 'zh-TW', voiceId: '1' } },
    { label: 'En0', value: { language: 'en-US', voiceId: '0' } },
    { label: 'En1', value: { language: 'en-US', voiceId: '1' } },
  ]

  const ttsLanguageVoice = ref({ language: 'zh-HK', voiceId: '0' })
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
  const audioBuffers = ref<(HTMLAudioElement | null)[]>([null, null])
  const currentBufferIndex = ref<0 | 1>(0)
  const currentElementIndex = ref(0)
  const textContentElements = ref<TextContentElement[]>([])

  watch(ttsLanguageVoice, (newLanguage, oldLanguage) => {
    if (newLanguage !== oldLanguage) {
      restartTextToSpeech()
      useLogEvent('tts_language_change', {
        nft_class_id: nftClassId,
      })
    }
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

  function createAudio(element: TextContentElement, bufferIndex: 0 | 1) {
    const audio = new Audio()
    const params = new URLSearchParams({
      text: element.text,
      language: ttsLanguageVoice.value.language,
      voice_id: ttsLanguageVoice.value.voiceId,
    })
    audio.src = `/api/reader/tts?${params.toString()}`

    audio.onplay = () => {
      options.onPlay?.(element)
    }

    audio.onended = () => {
      options.onEnd?.(element)
      playNextElement()
    }

    audio.onerror = (e) => {
      console.warn('Audio playback error:', e)
      if (e instanceof Event) {
        options.onError?.(e)
      }
    }

    audioBuffers.value[bufferIndex] = audio

    return audio
  }

  function playNextElement() {
    currentElementIndex.value += 1

    const nextElement = textContentElements.value[currentElementIndex.value]
    if (!nextElement) {
      options.onPageChange?.()
      return
    }

    if (options.checkIfNeededPageChange && options.checkIfNeededPageChange(nextElement)) {
      options.onPageChange?.()
    }

    const nextElementForBuffer = textContentElements.value[currentElementIndex.value + 1]

    if (nextElementForBuffer) {
      createAudio(nextElementForBuffer, currentBufferIndex.value)
    }

    currentBufferIndex.value = currentBufferIndex.value === 0 ? 1 : 0
    const nextAudio = audioBuffers.value[currentBufferIndex.value]

    setTimeout(() => {
      nextAudio?.play()
    }, 200)
  }

  async function startTextToSpeech() {
    if (!user.value?.isLikerPlus) {
      subscription.paywallModal.open()
      return
    }

    isShowTextToSpeechOptions.value = true

    if (!isTextToSpeechPlaying.value) {
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

    cleanupAudio()
    currentElementIndex.value = 0
    currentBufferIndex.value = 0
    isTextToSpeechOn.value = true

    useLogEvent('tts_start', {
      nft_class_id: nftClassId,
    })

    try {
      if (textContentElements.value.length === 0) {
        options.onPageChange?.()
        return
      }

      const firstElement = textContentElements.value[0]
      const secondElement = textContentElements.value[1]

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

  function cleanupAudio() {
    audioBuffers.value.forEach((audio) => {
      audio?.pause()
      if (audio) {
        audio.src = ''
      }
    })
    audioBuffers.value = [null, null]
  }

  function setTextContentElements(elements: TextContentElement[]) {
    textContentElements.value = elements
  }

  function restartTextToSpeech() {
    if (isTextToSpeechOn.value) {
      cleanupAudio()
      startTextToSpeech()
    }
  }

  return {
    ttsLanguageVoiceOptions,
    ttsLanguageVoice,
    isShowTextToSpeechOptions,
    isTextToSpeechOn,
    isTextToSpeechPlaying,
    pauseTextToSpeech,
    startTextToSpeech,
    setTextContentElements,
    restartTextToSpeech,
  }
}
