export interface PaywallModalProps {
  'modelValue'?: SubscriptionPlan
  'isFullscreen'?: boolean
  'isBackdropDismissible'?: boolean
  'hasTransition'?: boolean
  'isCloseButtonHidden'?: boolean
  'isProcessingSubscription'?: boolean
  'trialPeriodDays'?: number
  // Store-driven (IAP) trial overrides — see IAPTrialInfo in use-native-iap.ts.
  'isPaidTrialOverride'?: boolean
  'trialPriceString'?: string
  // Store-driven (IAP) recurring price strings — see IAPPlanPrice in use-native-iap.ts.
  'monthlyPriceString'?: string
  'yearlyPriceString'?: string
  // Overrides the default "save X%" yearly badge — used in IAP mode to compute
  // the percentage from real store prices rather than the Stripe-USD conversion.
  'yearlyBadgeText'?: string
  'mustCollectPaymentMethod'?: boolean
  'utmCampaign'?: string
  'utmMedium'?: string
  'utmSource'?: string
  'coupon'?: string
  'onUpdate:modelValue'?: (value: SubscriptionPlan) => void
  'onSubscribe'?: (props: {
    plan?: SubscriptionPlan
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    coupon?: string
  }) => void
  'onOpen'?: () => void
  'onClose'?: () => void
}
