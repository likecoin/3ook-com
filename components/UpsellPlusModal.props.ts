export interface UpsellPlusModalProps {
  isNotMember?: boolean
  isMonthlyMember?: boolean
  isProcessingSubscription?: boolean
  hasFreeTrial?: boolean
  mustCollectPaymentMethod?: boolean
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  onSubscribe?: (props: {
    hasFreeTrial?: boolean
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    plan?: SubscriptionPlan
  }) => void
  onOpen?: () => void
  onClose?: () => void
}
