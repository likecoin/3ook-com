export interface ProductPricingSelectorItem {
  name?: string
  label?: string
  originalPrice: string
  discountedPrice: string | null
  // The Plus price shown under the list price to whoever is not paying it.
  plusMemberPrice?: string | null
  plusMemberPriceNote?: string
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
