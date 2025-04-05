declare interface BookstorePrice {
  index: number
  price: number
  name: {
    en: string
    zh: string
  }
  description: {
    en: string
    zh: string
  }
  stock: number
  isSoldOut: boolean
  isAutoDeliver: boolean
  autoMemo: string
  hasShipping: boolean
  isPhysicalOnly: boolean
  isAllowCustomPrice: boolean
  order: number
}

declare interface BookstoreInfo {
  id: string
  classId: string
  prices: BookstorePrice[]
  isSoldOut: boolean
  stock: number
  ownerWallet: string
  mustClaimToView: boolean
  hideDownload: boolean
  enableCustomMessagePage: boolean
  name: string
  description: string
  keywords: string[]
  thumbnailUrl: string
  usageInfo: string
  timestamp: number
}
