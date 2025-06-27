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
