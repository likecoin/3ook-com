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
