import type { DropdownMenuItem } from '@nuxt/ui'
import type { ProductActionButtonsProps } from './ProductActionButtons.props'
import type { ProductPricingSelectorItem } from './ProductPricingSelector.props'

export interface ProductStickyBarProps {
  isApp: boolean
  isLibrary: boolean
  isUserBookOwner: boolean
  isPriceHidden: boolean
  readButtonVariant: 'outline' | 'solid'
  isLikerPlus: boolean
  pricingItems: ProductPricingSelectorItem[]
  selectedPricingItem?: ProductPricingSelectorItem
  stickyEditionDropdownItems: DropdownMenuItem[]
  actionButtons: ProductActionButtonsProps
}
