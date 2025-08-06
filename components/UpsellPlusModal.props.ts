export interface UpsellPlusModalProps {
  isLikerPlus?: boolean
  likerPlusPeriod?: LikerPlusStatus
  isProcessingSubscription?: boolean
  hasFreeTrial?: boolean
  mustCollectPaymentMethod?: boolean
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  selectedPricingItemIndex?: number
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
