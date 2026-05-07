import { computed, onMounted, toValue, type MaybeRefOrGetter } from 'vue'
import type { PricingCurrency } from '~/utils/pricing'

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

export type AffiliateCouponEffect =
  | { type: 'percent', value: number }
  | { type: 'flat', amount: Partial<Record<PricingCurrency, number>> }

export interface AffiliatePricingPageContent {
  prependedFeatures?: string[]
  ttsExclusiveBadgeText?: string
  yearlyBadgeText?: string
  monthlyBadgeText?: string
  couponEffect?: AffiliateCouponEffect
}

interface AffiliateDefinition {
  productionLikerId: string
  testnetLikerId?: string
  content: AffiliatePricingPageContent
}

// Liker IDs are normalized (no leading "@") — match normalizeLikerId().
// Both production and testnet IDs resolve to the same content so QA on
// sepolia uses the same treatment without an env switch.
const AFFILIATE_DEFINITIONS: AffiliateDefinition[] = [
  {
    productionLikerId: 'bsymfp',
    testnetLikerId: 'gpzauz',
    content: {
      prependedFeatures: ['獨家！啟明社長 聖修 聲線朗讀聽書'],
      ttsExclusiveBadgeText: '啟明專案獨家！',
      yearlyBadgeText: '啟明專案限定價',
      monthlyBadgeText: '啟明專案限定價',
      couponEffect: { type: 'flat', amount: { twd: 300, hkd: 75, usd: 10 } },
    },
  },
]

export function getAffiliatePricingPageContent(
  likerId: string | undefined,
): AffiliatePricingPageContent | undefined {
  if (!likerId) return undefined
  return AFFILIATE_DEFINITIONS.find(
    d => d.productionLikerId === likerId || d.testnetLikerId === likerId,
  )?.content
}

export function usePricingPageCampaign(options: {
  campaignId: MaybeRefOrGetter<string | undefined>
  affiliateLikerId?: MaybeRefOrGetter<string | undefined>
} = { campaignId: undefined }) {
  const { onLoaded } = useScriptPostHog()
  const { locale } = useI18n()
  const campaignId = computed(() => toValue(options.campaignId))
  const affiliateLikerId = computed(() => toValue(options.affiliateLikerId))
  const isChineseLocale = computed(() => locale.value === 'zh-Hant')

  // Affiliate hit takes precedence over campaign AB-test exposure so the
  // two systems don't fight for the same hero slot — and so the affiliate
  // visit doesn't pollute campaign experiment metrics.
  const isAffiliateActive = computed(
    () => !!getAffiliatePricingPageContent(affiliateLikerId.value),
  )

  const abTest = isChineseLocale.value
    ? useABTest({ experimentKey: 'pricing-page-campaign' })
    : undefined

  const resolvedCampaignId = computed(() => {
    if (isAffiliateActive.value) return null
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
    if (isAffiliateActive.value) return
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
