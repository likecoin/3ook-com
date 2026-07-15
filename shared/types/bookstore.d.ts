export interface BookstoreCMSProduct {
  id: string
  classId?: string
  classIds?: string[]
  title?: string
  titles?: string[]
  imageUrl?: string
  imageUrls?: string[]
  locales?: string[]
  isDRMFree: boolean
  isAdultOnly?: boolean
  isPlusReadingEnabled?: boolean
  isMultiple?: boolean
  minPrice?: number
  minPriceInDecimalByCurrency?: BookPriceInDecimalByCurrency
  timestamp?: number
  totalStaked?: bigint
  stakerCount?: number
}

export interface FetchBookstoreCMSProductsResponseData {
  records: Array<BookstoreCMSProduct>
  offset?: string
  hasMore?: boolean
}

export interface BookstoreCMSTag {
  id: string
  name: {
    zh: string
    en: string
  }
  description: {
    zh: string
    en: string
  }
  isPublic: boolean
  isForLibrary: boolean
  isForStore: boolean
}

export interface FetchBookstoreCMSTagsResponseData {
  records: Array<BookstoreCMSTag>
  offset?: string
}

export interface BookListItem {
  nftClassId: string
  priceIndex: number
  timestamp?: number
}

declare global {
  interface BookstoreItem {
    totalStaked?: bigint
    stakerCount?: number
    likeRank?: number
    id?: string
    classId?: string
    classIds?: string[]
    title?: string
    titles?: string[]
    imageUrl?: string
    imageUrls?: string[]
    locales?: string[]
    isDRMFree?: boolean
    isAdultOnly?: boolean
    isPlusReadingEnabled?: boolean
    isMultiple?: boolean
    minPrice?: number
    minPriceInDecimalByCurrency?: BookPriceInDecimalByCurrency
    timestamp?: number
  }

  interface BookstoreItemList {
    items: BookstoreItem[]
    isFetchingItems: boolean
    hasFetchedItems: boolean
    nextItemsKey: number | string | undefined
    mayHaveMore?: boolean
  }

  // Per-currency price overrides from the API, in that currency's minor units
  // (e.g. cents). A missing currency falls back to ladder conversion.
  interface BookPriceInDecimalByCurrency {
    hkd?: number
    twd?: number
  }

  interface BookstorePrice {
    index: number
    price: number
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency
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

  interface BookstoreInfo {
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
    isAdultOnly?: boolean
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
    genre?: string
    keywords: string[]
    thumbnailUrl: string
    usageInfo: string
    tableOfContents?: string
    previewContent?: string
    recommendedClassIds?: string[]
    promotionalImages?: string[]
    promotionalVideos?: string[]
    plusPromoEnabled?: boolean
    isPlusReadingEnabled?: boolean
    isPreviewEnabled?: boolean
    previewPercentage?: number
    timestamp: number
  }

  interface CartItem {
    nftClassId: string
    priceIndex: number
    customPrice?: number
    quantity?: number
  }
}

export {}
