interface TextContentElement {
  id: string
  text: string
}

interface TTSOptions {
  onPlay?: (element: TextContentElement) => void
  onEnd?: (element: TextContentElement) => void
  onError?: (error: Event) => void
  onPageChange?: () => void
  checkIfNeedPageChange?: (element: TextContentElement) => boolean
}

export function useTextToSpeech(options: TTSOptions = {}) {
  const { user } = useUserSession()
  const subscription = useSubscription()
  const { nftClassId } = useReader()

  const ttsLanguageOptions = [
    { label: '粵', value: 'zh-HK' },
    { label: '國', value: 'zh-TW' },
    { label: 'En', value: 'en-US' },
  ]

  const ttsLanguage = ref('zh-HK')
  const isShowTextToSpeechOptions = ref(false)
  const isTextToSpeechOn = ref(false)
  const isTextToSpeechPlaying = ref(false)
  const audioQueue = ref<HTMLAudioElement[]>([])
  const currentAudioIndex = ref(0)
  const textContentElements = ref<TextContentElement[]>([])

  watch(ttsLanguage, (newLanguage, oldLanguage) => {
    if (newLanguage !== oldLanguage) {
      useLogEvent('tts_language_change', {
        nft_class_id: nftClassId,
      })
    }
  })

  function pauseTextToSpeech() {
    if (isTextToSpeechOn.value) {
      if (audioQueue.value[currentAudioIndex.value]) {
        audioQueue.value[currentAudioIndex.value]?.pause()
      }
      isTextToSpeechPlaying.value = false
      useLogEvent('tts_pause', {
        nft_class_id: nftClassId,
      })
    }
  }

  function createAudio(element: TextContentElement) {
    const audio = new Audio()
    const params = new URLSearchParams({
      text: element.text,
      language: ttsLanguage.value,
    })
    audio.src = `/api/reader/tts?${params.toString()}`

    audio.onplay = () => {
      options.onPlay?.(element)
    }

    audio.onended = () => {
      options.onEnd?.(element)

      if (audioQueue.value.length < textContentElements.value.length) {
        const textElement = textContentElements.value[audioQueue.value.length]
        if (textElement) {
          const nextAudio = createAudio(textElement)
          audioQueue.value.push(nextAudio)
        }
      }

      if (currentAudioIndex.value < audioQueue.value.length - 1) {
        currentAudioIndex.value++
        const nextElement = textContentElements.value[currentAudioIndex.value]

        if (options.checkIfNeedPageChange && nextElement) {
          if (options.checkIfNeedPageChange(nextElement)) {
            options.onPageChange?.()
          }
        }

        setTimeout(() => {
          audioQueue.value[currentAudioIndex.value]?.play()
        }, 200) // Add a small delay since some minimax voice doesn't have gap at the end
      }
      else {
        options.onPageChange?.()
      }
    }

    audio.onerror = (e) => {
      console.warn('Audio playback error:', e)
      if (e instanceof Event) {
        options.onError?.(e)
      }
    }

    return audio
  }

  async function startTextToSpeech() {
    if (!user.value?.isLikerPlus) {
      subscription.paywallModal.open()
      return
    }

    isShowTextToSpeechOptions.value = true

    if (!isTextToSpeechPlaying.value) {
      isTextToSpeechPlaying.value = true
      if (audioQueue.value[currentAudioIndex.value]) {
        audioQueue.value[currentAudioIndex.value]?.play()
        useLogEvent('tts_resume', {
          nft_class_id: nftClassId,
        })
      }
      return
    }

    // Clean up existing audio
    audioQueue.value.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    audioQueue.value = []
    currentAudioIndex.value = 0
    isTextToSpeechOn.value = true

    useLogEvent('tts_start', {
      nft_class_id: nftClassId,
    })

    try {
      // Load up to 2 paragraphs for text-to-speech
      for (let i = 0; i < Math.min(2, textContentElements.value.length); i++) {
        const element = textContentElements.value[i]
        if (element) {
          const audio = createAudio(element)
          audioQueue.value.push(audio)
        }
      }

      if (audioQueue.value.length > 0) {
        audioQueue.value[0]?.play()
      }
      else {
        options.onPageChange?.()
      }
    }
    catch (error) {
      isTextToSpeechOn.value = false
      throw error
    }
  }

  function setTextContentElements(elements: TextContentElement[]) {
    textContentElements.value = elements
  }

  function restartTextToSpeech() {
    if (isTextToSpeechOn.value) {
      startTextToSpeech()
    }
  }

  return {
    ttsLanguageOptions,
    ttsLanguage,
    isShowTextToSpeechOptions,
    isTextToSpeechOn,
    isTextToSpeechPlaying,
    pauseTextToSpeech,
    startTextToSpeech,
    setTextContentElements,
    restartTextToSpeech,
  }
}
