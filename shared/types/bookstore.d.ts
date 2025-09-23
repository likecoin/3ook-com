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
  isMultiple?: boolean
  minPrice?: number
  timestamp?: number
}

export interface FetchBookstoreCMSProductsResponseData {
  records: Array<BookstoreCMSProduct>
  offset?: string
}

export interface BookstoreCMSTag {
  id?: string
  name: {
    zh?: string
    en?: string
  }
  description: {
    zh?: string
    en?: string
  }
  isPublic?: boolean
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
