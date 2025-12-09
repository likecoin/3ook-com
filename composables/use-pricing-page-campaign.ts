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
  },
}

export function usePricingPageCampaign(options: {
  campaignId: MaybeRefOrGetter<string | undefined>
} = { campaignId: undefined }) {
  const { $posthog } = useNuxtApp()
  const campaignId = computed(() => toValue(options.campaignId))
  const { variant: experimentVariant } = useABTest({ experimentKey: 'pricing-page-campaign' })

  const resolvedCampaignId = computed(() => {
    // If campaign ID is explicitly provided, use it
    if (campaignId.value) return campaignId.value
    // Otherwise, use the experiment variant if available
    return experimentVariant.value
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
    if ($posthog && campaignId.value) {
      const posthog = $posthog()
      // If campaignId is explicitly set via query string, override the feature flag
      posthog.featureFlags.overrideFeatureFlags({
        'pricing-page-campaign': campaignId.value,
      })
    }
  }

  watch(campaignId, () => overrideFeatureFlag)
  onMounted(() => overrideFeatureFlag)

  return {
    campaignContent,
    isBlocktrendCampaign,
  }
}
