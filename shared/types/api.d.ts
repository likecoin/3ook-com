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
  // Owning billing system; drives manage-subscription routing on the client.
  likerPlusProvider?: LikerPlusProvider
  plusAffiliateFrom?: string
  intercomToken?: string
}
