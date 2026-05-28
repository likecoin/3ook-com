import type { RouteLocationAsRelativeGeneric } from 'vue-router'

export interface UpsellPlusModalSubscribeEventPayload {
  plan?: SubscriptionPlan
  trialPeriodDays?: number
  mustCollectPaymentMethod?: boolean
  nftClassId?: string
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  coupon?: string
  redirectRoute?: RouteLocationAsRelativeGeneric
}

export interface UpsellPlusModalProps {
  isLikerPlus?: boolean
  likerPlusPeriod?: LikerPlusStatus
  isProcessingSubscription?: boolean
  trialPeriodDays?: number
  trialPrice?: number
  // Store-driven (IAP) trial overrides — see IAPTrialInfo in use-native-iap.ts.
  isPaidTrialOverride?: boolean
  trialPriceString?: string
  // Store-driven (IAP) recurring price strings — see IAPPlanPrice in use-native-iap.ts.
  monthlyPriceString?: string
  yearlyPriceString?: string
  // Overrides the default "save X%" yearly badge — used in IAP mode to compute
  // the percentage from real store prices rather than the Stripe-USD conversion.
  yearlyBadgeText?: string
  mustCollectPaymentMethod?: boolean
  nftClassId?: string
  bookPrice?: number
  isAudioHidden?: boolean
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  selectedPricingItemIndex?: number
  from?: string
  onSubscribe?: (payload: UpsellPlusModalSubscribeEventPayload) => void
  onOpen?: () => void
  onClose?: (isSuccess: boolean) => void
}
