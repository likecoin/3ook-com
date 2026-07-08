export interface ProductPricingSelectorItem {
  name?: string
  label?: string
  originalPrice: string
  discountedPrice: string | null
  isSelected: boolean
  isSoldOut?: boolean
  renderedDescription: string
}

export interface ProductPricingSelectorProps {
  items: ProductPricingSelectorItem[]
  isLikerPlus: boolean
  contentTypes: string[]
  isDownloadable: boolean
  isTtsSupported: boolean
  ttsTagColor: 'primary' | 'secondary'
  isPlusReadingEnabled: boolean
  plusReadingTagColor: 'primary' | 'secondary'
}
