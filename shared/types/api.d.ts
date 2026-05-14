export interface LikerInfoResponseData {
  user: string
  displayName: string
  avatar: string
  cosmosWallet: string
  likeWallet: string
  evmWallet: string
  description: string
  isLikerPlus?: boolean
  isExpiredLikerPlus?: boolean
  likerPlusSubscriptionStatus?: 'active' | 'past_due' | 'canceled'
}

export interface LikerProfileResponseData extends LikerInfoResponseData {
  email?: string
  likerPlusPeriod?: LikerPlusStatus
  plusAffiliateFrom?: string
  intercomToken?: string
}
