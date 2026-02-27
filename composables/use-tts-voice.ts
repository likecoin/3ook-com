import { useStorage } from '@vueuse/core'
import type { CustomVoiceData } from '~/shared/types/custom-voice'
import phoebeAvatar from '@/assets/images/voice-avatars/phoebe.jpg'
import auroraAvatar from '@/assets/images/voice-avatars/aurora.jpg'
import pazuAvatar from '@/assets/images/voice-avatars/pazu.jpg'
import defaultAvatar from '@/assets/images/voice-avatars/default.jpg'
import customDefaultAvatar from '@/assets/images/voice-avatars/custom-default.jpg'

interface TTSVoiceOptions {
  bookLanguage?: string | Ref<string> | ComputedRef<string>
  customVoice?: Ref<CustomVoiceData | null>
}

export function useTTSVoice(options: TTSVoiceOptions = {}) {
  const { bookLanguage, customVoice } = options

  const config = useRuntimeConfig()
  const { detectedCountry } = useDetectedGeolocation()
  const { getResizedImageURL } = useImageResize()

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
    { label: 'Aurora - 國語', value: 'zh-TW_aurora' },
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

  const isBookEnglish = computed(() => {
    const language = toValue(bookLanguage)
    return language ? language.toLowerCase().startsWith('en') : false
  })

  const ttsLanguageVoiceValues = computed(() => {
    const values = availableTTSLanguageVoiceOptions.value.map(option => option.value)
    if (customVoice?.value?.voiceId && !isBookEnglish.value) {
      return ['custom', ...values]
    }
    return values
  })

  function getDefaultTTSVoiceByLocale(): string {
    const country = detectedCountry.value
    const voice = ttsLanguageVoiceValues.value.find((voice) => {
      return country === 'HK' ? voice.startsWith('zh-HK') : !voice.startsWith('zh-HK')
    }) || (ttsLanguageVoiceValues.value[0] as string)

    return voice
  }

  const ttsLanguageVoice = useStorage(getTTSConfigKeyWithSuffix(ttsConfigCacheKey.value, 'voice'), getDefaultTTSVoiceByLocale())

  const setTTSLanguageVoice = (languageVoice?: string) => {
    if (languageVoice) {
      ttsLanguageVoice.value = languageVoice
    }
  }

  const activeTTSLanguageVoiceAvatar = computed(() => {
    return getVoiceAvatar(ttsLanguageVoice.value)
  })

  const activeTTSLanguageVoiceLabel = computed(() => {
    const voice = ttsLanguageVoice.value
    return (
      ttsLanguageVoiceOptionsWithAvatars.value.find(
        (option: { value: string, label: string }) => option.value === voice,
      )?.label || voice
    )
  })

  const ttsLanguageVoiceOptionsWithAvatars = computed(() => {
    const builtInOptions = availableTTSLanguageVoiceOptions.value.map((option: { value: string, label: string }) => ({
      ...option,
      avatar: getVoiceAvatar(option.value),
    }))

    if (customVoice?.value?.voiceId && !isBookEnglish.value) {
      return [
        {
          label: customVoice.value.voiceName,
          value: 'custom',
          avatar: getVoiceAvatar('custom'),
        },
        ...builtInOptions,
      ]
    }

    return builtInOptions
  })

  function getVoiceAvatar(languageVoice: string): string {
    if (languageVoice === 'custom') {
      const raw = customVoice?.value?.avatarUrl
      return raw ? getResizedImageURL(raw, { size: 128 }) : customDefaultAvatar
    }

    switch (languageVoice) {
      case 'zh-HK_phoebe':
        return phoebeAvatar

      case 'zh-HK_pazu':
        return pazuAvatar

      case 'zh-TW_aurora':
        return auroraAvatar

      default:
        return defaultAvatar
    }
  }

  return {
    isBookEnglish,
    ttsLanguageVoiceOptions: availableTTSLanguageVoiceOptions,
    ttsLanguageVoice,
    activeTTSLanguageVoiceAvatar,
    activeTTSLanguageVoiceLabel,
    ttsLanguageVoiceOptionsWithAvatars,
    ttsLanguageVoiceValues,
    getVoiceAvatar,
    setTTSLanguageVoice,
  }
}
