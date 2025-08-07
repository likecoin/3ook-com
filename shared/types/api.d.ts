export interface LikerInfoResponseData {
  user: string
  displayName: string
  avatar: string
  cosmosWallet: string
  likeWallet: string
  evmWallet: string
  description: string
  isLikerPlus?: boolean
}

export interface LikerProfileResponseData extends LikerInfoResponseData {
  email?: string
  likerPlusPeriod?: LikerPlusStatus
}
