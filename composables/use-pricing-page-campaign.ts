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
}

export function usePricingPageCampaign(options: { campaignId: MaybeRefOrGetter<string | undefined> }) {
  const campaignId = computed(() => toValue(options.campaignId))

  const campaignContent = computed(() => {
    if (!campaignId.value) return undefined
    const content = CAMPAIGNS[campaignId.value]
    if (!content) return undefined
    const { type } = content
    return {
      id: campaignId.value,
      ...content,
      isVideo: type === 'video',
      isImage: type === 'image',
      isCustom: type === 'custom',
    }
  })

  const isBlocktrendCampaign = computed(() => {
    return campaignId.value === 'blocktrend-plus'
  })

  return {
    campaignContent,
    isBlocktrendCampaign,
  }
}
