export interface LikerInfoResponseData {
  // Immutable internal id (the account's document id); never changes on rename.
  user: string
  // Current public handle. Equals `user` until the account renames itself once.
  handle?: string
  displayName: string
  avatar: string
  cosmosWallet: string
  likeWallet: string
  evmWallet: string
  description: string
  isLikerPlus?: boolean
  isLikerPlusTrial?: boolean
  isExpiredLikerPlus?: boolean
  likerPlusSubscriptionStatus?: 'active' | 'past_due' | 'canceled'
}

export interface LikerProfileResponseData extends LikerInfoResponseData {
  email?: string
  likerPlusPeriod?: LikerPlusStatus
  likerPlusTier?: LikerPlusTier
  // Owning billing system; drives manage-subscription routing on the client.
  likerPlusProvider?: LikerPlusProvider
  likerPlusStore?: LikerPlusStore
  plusAffiliateFrom?: string
  intercomToken?: string
}
