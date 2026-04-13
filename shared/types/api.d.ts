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
}

export interface LikerProfileResponseData extends LikerInfoResponseData {
  email?: string
  likerPlusPeriod?: LikerPlusStatus
  plusAffiliateFrom?: string
}
