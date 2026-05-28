import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'

export interface PricingPagePromoPricing {
  yearly?: { price: number }
  monthly?: { price: number }
}

export interface PricingPageContentProps {
  modelValue?: SubscriptionPlan
  isProcessingSubscription?: boolean
  trialPeriodDays?: number
  // Store-driven (IAP) trial overrides — see IAPTrialInfo in use-native-iap.ts.
  isPaidTrialOverride?: boolean
  trialPriceString?: string
  // Store-driven (IAP) recurring price strings — see IAPPlanPrice in use-native-iap.ts.
  monthlyPriceString?: string
  yearlyPriceString?: string
  mustCollectPaymentMethod?: boolean
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  coupon?: string
  affiliateVoices?: AffiliateVoiceData[]
  affiliateLikerId?: string
  prependedFeatures?: string[]
  ttsExclusiveBadgeText?: string
  yearlyBadgeText?: string
  monthlyBadgeText?: string
  promoPricing?: PricingPagePromoPricing
}
