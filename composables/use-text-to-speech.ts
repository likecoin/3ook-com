import { useStorage, useDebounceFn } from '@vueuse/core'
import phoebeAvatar from '@/assets/images/voice-avatars/phoebe.jpg'
import leiTingYinAvatar from '@/assets/images/voice-avatars/lei-ting-yin.jpg'
import pazuAvatar from '@/assets/images/voice-avatars/pazu.jpg'
import defaultAvatar from '@/assets/images/voice-avatars/default.jpg'

interface TTSOptions {
  nftClassId?: string
  onError?: (error: string | Event | MediaError) => void
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
  const { t: $t } = useI18n()
  const ttsConfigCacheKey = computed(() =>
    [
      config.public.cacheKeyPrefix,
      TTS_CONFIG_KEY,
    ].join('-'),
  )

  // hardcoded voice options for now
  const ttsLanguageVoiceOptions = [
    { label: 'Pazu 薯伯伯 - 粵語', value: 'zh-HK_pazu' },
    { label: 'Phoebe - 粵語', value: 'zh-HK_phoebe' },
    { label: '曉晨 - 粵語', value: 'zh-HK_xiaochen' },
    { label: '雷庭音 - 國語', value: 'zh-TW_0' },
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
  const ttsPlaybackRateOptions = computed(() => [0.5, 0.75, 1.0, 1.25, 1.5].map(rate => ({
    label: rate === 1.0 ? $t('reader_text_to_speech_normal_speed') : `${rate}x`,
    value: rate,
  })))

  function getDefaultTTSVoiceByLocale(): string {
    let voice: string = ttsLanguageVoiceValues[0] as string

    if (import.meta.client && typeof navigator !== 'undefined') {
      const locales = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages.map(l => l.toLowerCase())
        : [navigator.language?.toLowerCase()].filter(Boolean)

      if (locales.some(locale => locale.includes('-hk'))) {
        voice = ttsLanguageVoiceValues.find(value => value.startsWith('zh-HK')) || voice
      }
      else if (locales.some(locale => locale.startsWith('zh') && !locale.includes('-hk'))) {
        voice = ttsLanguageVoiceValues.find(value => value.startsWith('zh-TW')) || voice
      }
    }

    return voice
  }

  const ttsLanguageVoice = useStorage(getTTSConfigKeyWithSuffix(ttsConfigCacheKey.value, 'voice'), getDefaultTTSVoiceByLocale())
  const ttsPlaybackRate = useStorage(getTTSConfigKeyWithSuffix(ttsConfigCacheKey.value, 'playback-rate'), 1.0)
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

  const activeTTSLanguageVoiceAvatar = computed(() => {
    return getVoiceAvatar(ttsLanguageVoice.value)
  })

  const ttsLanguageVoiceOptionsWithAvatars = computed(() => {
    return availableTTSLanguageVoiceOptions.value.map((option: { value: string, label: string }) => ({
      ...option,
      avatar: getVoiceAvatar(option.value),
    }))
  })

  function getVoiceAvatar(voiceValue: string): string {
    switch (voiceValue) {
      case 'zh-HK_phoebe':
        return phoebeAvatar

      case 'zh-HK_pazu':
        return pazuAvatar

      case 'zh-TW_0': // lei-ting-yin
        return leiTingYinAvatar

      default:
        return defaultAvatar
    }
  }

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

    const [language, ...voiceIdParts] = ttsLanguageVoice.value.split('_')
    const params = new URLSearchParams({
      text: element.text,
      language: language || 'zh-HK',
      voice_id: voiceIdParts.join('_') || '0',
    })
    audio.src = `/api/reader/tts?${params.toString()}`
    audio.playbackRate = ttsPlaybackRate.value
    audio.setAttribute('data-text', element.text)

    return audio
  }

  function playCurrentElement({ delay = 0 } = {}) {
    const currentElement = ttsSegments.value[currentTTSSegmentIndex.value]
    if (!currentElement) return

    currentBufferIndex.value = currentBufferIndex.value === 0 ? 1 : 0
    createAudio(currentElement, currentBufferIndex.value)

    const nextElementForBuffer = ttsSegments.value[currentTTSSegmentIndex.value + 1]

    const nextIndex = currentBufferIndex.value === 0 ? 1 : 0

    if (nextElementForBuffer) {
      createAudio(nextElementForBuffer, nextIndex)
    }

    if (currentAudioTimeout.value) clearTimeout(currentAudioTimeout.value)

    currentAudioTimeout.value = setTimeout(() => {
      const currentAudio = audioBuffers.value[currentBufferIndex.value]
      if (currentAudio && isTextToSpeechPlaying.value) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        currentAudio.play()
      }
    }, delay)
  }

  function playNextElement() {
    if (currentTTSSegmentIndex.value + 1 >= ttsSegments.value.length) {
      return
    }
    currentTTSSegmentIndex.value += 1
    playCurrentElement({ delay: 200 })
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
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    ttsLanguageVoiceOptionsWithAvatars,
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
    skipToIndex,
    skipBackward,
    restartTextToSpeech,
    stopTextToSpeech,
  }
}
