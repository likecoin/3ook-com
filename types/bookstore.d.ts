declare interface BookstoreItem {
  totalStaked?: bigint
  stakerCount?: number
  id?: string
  classId?: string
  classIds?: string[]
  title?: string
  titles?: string[]
  imageUrl?: string
  imageUrls?: string[]
  locales?: string[]
  isDRMFree?: boolean
  isMultiple?: boolean
  minPrice?: number
  timestamp?: number
}

declare interface BookstoreItemList {
  items: BookstoreItem[]
  isFetchingItems: boolean
  hasFetchedItems: boolean
  nextItemsKey: number | string | undefined
}

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
  evmClassId?: string
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
  hideUpsell: boolean
  enableCustomMessagePage: boolean
  name: string
  description: string
  descriptionFull?: string
  descriptionSummary?: string
  reviewTitle?: string
  reviewURL?: string
  author: {
    name: string
    description: string
  }
  keywords: string[]
  thumbnailUrl: string
  usageInfo: string
  tableOfContents?: string
  recommendedClassIds?: string[]
  promotionalImages?: string[]
  promotionalVideos?: string[]
  timestamp: number
}

interface CartItem {
  nftClassId: string
  priceIndex: number
  customPrice?: number
  quantity?: number
}
