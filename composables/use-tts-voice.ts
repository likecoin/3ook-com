import { useStorage } from '@vueuse/core'
import phoebeAvatar from '@/assets/images/voice-avatars/phoebe.jpg'
import leiTingYinAvatar from '@/assets/images/voice-avatars/lei-ting-yin.jpg'
import pazuAvatar from '@/assets/images/voice-avatars/pazu.jpg'
import defaultAvatar from '@/assets/images/voice-avatars/default.jpg'

interface TTSVoiceOptions {
  bookLanguage?: string | Ref<string> | ComputedRef<string>
}

export function useTTSVoice(options: TTSVoiceOptions = {}) {
  const { bookLanguage } = options

  const config = useRuntimeConfig()

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
    return availableTTSLanguageVoiceOptions.value.map((option: { value: string, label: string }) => ({
      ...option,
      avatar: getVoiceAvatar(option.value),
    }))
  })

  function getVoiceAvatar(languageVoice: string): string {
    switch (languageVoice) {
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

  return {
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
