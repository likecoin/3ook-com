import { computed, onMounted, toValue, type MaybeRefOrGetter } from 'vue'

interface PricingPageCampaign {
  type: 'image' | 'video' | 'custom'
  title?: string
  description?: string
}

const CAMPAIGNS: Record<string, PricingPageCampaign> = {
  'blocktrend-plus': {
    type: 'custom',
  },
  'fragmentedtime': {
    type: 'video',
    title: '善用碎片時間，自我增值',
    description: '上班族必備！在午休、上班途中，甚至做運動時聽書，放鬆身心和汲取新知！',
  },
  'fragmentedtime2': {
    type: 'video',
    title: '善用碎片時間，自我增值',
    description: '上班族必備！在午休、上班途中，甚至做運動時聽書，放鬆身心和汲取新知！',
  },
  'xmas2025': {
    type: 'video',
    title: '冬日慢活\n讓閱讀變得更自在，讓你成為更有趣的人',
    description: '閱讀與聽書，隨時切換，不限手機／平板／電腦',
  },
}

export function usePricingPageCampaign(options: {
  campaignId: MaybeRefOrGetter<string | undefined>
} = { campaignId: undefined }) {
  const { onLoaded } = useScriptPostHog()
  const { locale } = useI18n()
  const campaignId = computed(() => toValue(options.campaignId))
  const isChineseLocale = computed(() => locale.value === 'zh-Hant')

  // Only run campaign A/B test for Chinese locale users
  const abTest = isChineseLocale.value
    ? useABTest({ experimentKey: 'pricing-page-campaign' })
    : undefined

  const resolvedCampaignId = computed(() => {
    // If campaign ID is explicitly provided, use it
    if (campaignId.value) return campaignId.value
    // Otherwise, use the experiment variant if available (Chinese locale only)
    return abTest?.variant.value ?? null
  })

  const campaignContent = computed(() => {
    if (!resolvedCampaignId.value) return undefined
    const content = CAMPAIGNS[resolvedCampaignId.value]
    if (!content) return undefined
    const { type } = content
    return {
      id: resolvedCampaignId.value,
      ...content,
      isVideo: type === 'video',
      isImage: type === 'image',
      isCustom: type === 'custom',
    }
  })

  const isBlocktrendCampaign = computed(() => {
    return resolvedCampaignId.value === 'blocktrend-plus'
  })
  const overrideFeatureFlag = () => {
    const currentCampaignId = campaignId.value
    if (!currentCampaignId) return
    onLoaded(({ posthog }) => {
      posthog.featureFlags.overrideFeatureFlags({
        'pricing-page-campaign': currentCampaignId,
      })
    })
  }

  watch(campaignId, overrideFeatureFlag)
  onMounted(overrideFeatureFlag)

  return {
    campaignContent,
    isBlocktrendCampaign,
  }
}
