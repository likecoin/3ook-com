import type { RouteLocationAsRelativeGeneric } from 'vue-router'

export interface UpsellPlusModalSubscribeEventPayload {
  plan?: SubscriptionPlan
  hasFreeTrial?: boolean
  mustCollectPaymentMethod?: boolean
  nftClassId?: string
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  redirectRoute?: RouteLocationAsRelativeGeneric
}

export interface UpsellPlusModalProps {
  isLikerPlus?: boolean
  likerPlusPeriod?: LikerPlusStatus
  isProcessingSubscription?: boolean
  hasFreeTrial?: boolean
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
