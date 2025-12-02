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
  mustCollectPaymentMethod?: boolean
  nftClassId?: string
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  selectedPricingItemIndex?: number
  onSubscribe?: (payload: UpsellPlusModalSubscribeEventPayload) => void
  onOpen?: () => void
  onClose?: () => void
}
