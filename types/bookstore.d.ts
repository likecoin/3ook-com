declare interface BookstorePrice {
  index: number
  price: number
  name: {
    en: string
    zh: string
  } | string
  description: {
    en: string
    zh: string
  } | string
  stock: number
  isSoldOut: boolean
  isAutoDeliver: boolean
  isUnlisted: boolean
  autoMemo: string
  isAllowCustomPrice: boolean
  isTippingEnabled: boolean
  order: number
}

declare interface BookstoreInfo {
  id: string
  classId: string
  redirectClassId?: string
  prices: BookstorePrice[]
  inLanguage: string
  isSoldOut: boolean
  stock: number
  ownerWallet: string
  mustClaimToView: boolean
  isHidden: boolean
  isApprovedForSale: boolean
  isApprovedForIndexing: boolean
  isApprovedForAds: boolean
  hideDownload: boolean
  hideAudio: boolean
  enableCustomMessagePage: boolean
  name: string
  description: string
  descriptionFull?: string
  descriptionSummary?: string
  author: {
    name: string
    description: string
  }
  keywords: string[]
  thumbnailUrl: string
  usageInfo: string
  recommendedClassIds?: string[]
  timestamp: number
}

interface CartItem {
  nftClassId: string
  priceIndex: number
  customPrice?: number
  quantity?: number
}
