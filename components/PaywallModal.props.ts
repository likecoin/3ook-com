export interface PaywallModalProps {
  'modelValue'?: SubscriptionPlan
  'isFullscreen'?: boolean
  'isBackdropDismissible'?: boolean
  'isCloseButtonHidden'?: boolean
  'originalYearlyPrice'?: string | number
  'originalMonthlyPrice'?: string | number
  'discountedYearlyPrice'?: string | number
  'discountedMonthlyPrice'?: string | number
  'isProcessingSubscription'?: boolean
  'onUpdate:modelValue'?: (value: SubscriptionPlan) => void
  'onSubscribe'?: () => void
  'onOpen'?: () => void
  'onClose'?: () => void
}
