export interface ProductPricingSelectorItem {
  name?: string
  label?: string
  originalPrice: string
  discountedPrice: string | null
  // The Plus price shown to a non-member under the list price.
  plusMemberPrice?: string | null
  isSelected: boolean
  isSoldOut?: boolean
  renderedDescription: string
}

export interface ProductPricingSelectorProps {
  items: ProductPricingSelectorItem[]
  isPriceHidden?: boolean
  isPlusPriceYearly: boolean
  contentTypes: string[]
  isDownloadable: boolean
  isTtsSupported: boolean
  ttsTagColor: 'primary' | 'secondary'
}
