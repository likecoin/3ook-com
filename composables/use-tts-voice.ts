import { useStorage } from '@vueuse/core'
import { encodeAffiliateVoiceId, isAffiliateVoiceId } from '~/shared/utils/tts-sig'
import type { CustomVoiceData, AffiliateVoiceData } from '~/shared/types/custom-voice'
import phoebeAvatar from '@/assets/images/voice-avatars/phoebe.jpg'
import auroraAvatar from '@/assets/images/voice-avatars/aurora.jpg'
import astroAvatar from '@/assets/images/voice-avatars/astro.jpg'
import pazuAvatar from '@/assets/images/voice-avatars/pazu.jpg'
import defaultAvatar from '@/assets/images/voice-avatars/default.jpg'
import customDefaultAvatar from '@/assets/images/voice-avatars/custom-default.jpg'

interface TTSVoiceOptions {
  bookLanguage?: string | Ref<string> | ComputedRef<string>
  customVoice?: Ref<CustomVoiceData | null>
  affiliateVoice?: Ref<AffiliateVoiceData | null>
  nftClassId?: string
}

export function useTTSVoice(options: TTSVoiceOptions = {}) {
  const { bookLanguage, customVoice, affiliateVoice, nftClassId } = options

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
    { label: 'Phoebe - 粵語口語', value: 'zh-HK_phoebe' },
    { label: '許明恩 - 國語', value: 'zh-TW_astro' },
    { label: 'Aurora - 國語', value: 'zh-TW_aurora' },
    { label: 'English female', value: 'en-US_0' },
    { label: 'English male', value: 'en-US_1' },
  ]

  if (config.public.isTestnet) {
    ttsLanguageVoiceOptions.push(
      { label: '粵語男聲', value: 'zh-HK_1' },
      { label: '粵語女聲', value: 'zh-HK_0' },
      { label: '國語男聲', value: 'zh-TW_1' },
      { label: '國語女聲', value: 'zh-TW_0' },
    )
  }

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

  const affiliateVoiceValue = computed(() =>
    affiliateVoice?.value?.voiceId && nftClassId ? encodeAffiliateVoiceId(nftClassId) : undefined,
  )

  const ttsLanguageVoiceValues = computed(() => {
    const values = availableTTSLanguageVoiceOptions.value.map(option => option.value)
    const result: string[] = []
    if (affiliateVoiceValue.value && !isBookEnglish.value) {
      result.push(affiliateVoiceValue.value)
    }
    if (customVoice?.value?.voiceId && !isBookEnglish.value) {
      result.push('custom')
    }
    return [...result, ...values]
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

    const extraOptions: { label: string, value: string, avatar: string }[] = []

    if (affiliateVoiceValue.value && !isBookEnglish.value && affiliateVoice?.value) {
      extraOptions.push({
        label: `★ ${affiliateVoice.value.voiceName}`,
        value: affiliateVoiceValue.value,
        avatar: getVoiceAvatar(affiliateVoiceValue.value),
      })
    }

    if (customVoice?.value?.voiceId && !isBookEnglish.value) {
      extraOptions.push({
        label: customVoice.value.voiceName,
        value: 'custom',
        avatar: getVoiceAvatar('custom'),
      })
    }

    return [...extraOptions, ...builtInOptions]
  })

  function getVoiceAvatar(languageVoice: string): string {
    if (isAffiliateVoiceId(languageVoice)) {
      return customDefaultAvatar
    }
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

      case 'zh-TW_astro':
        return astroAvatar

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
