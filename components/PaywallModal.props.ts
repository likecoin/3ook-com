export interface PaywallModalProps {
  'modelValue'?: SubscriptionPlan
  'isFullscreen'?: boolean
  'isBackdropDismissible'?: boolean
  'hasTransition'?: boolean
  'isCloseButtonHidden'?: boolean
  'isProcessingSubscription'?: boolean
  'trialPeriodDays'?: number
  'mustCollectPaymentMethod'?: boolean
  'utmCampaign'?: string
  'utmMedium'?: string
  'utmSource'?: string
  'onUpdate:modelValue'?: (value: SubscriptionPlan) => void
  'onSubscribe'?: (props: {
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }) => void
  'onOpen'?: () => void
  'onClose'?: () => void
}
