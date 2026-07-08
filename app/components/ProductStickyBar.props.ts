import type { DropdownMenuItem } from '@nuxt/ui'
import type { ProductPricingSelectorItem } from './ProductPricingSelector.props'

export interface ProductStickyBarProps {
  isApp: boolean
  isLibrary: boolean
  isUserBookOwner: boolean
  isPlusReadingCtaVisible: boolean
  plusReadingCtaLabel: string
  plusReadingCtaVariant: 'outline' | 'solid'
  readButtonVariant: 'outline' | 'solid'
  isLikerPlus: boolean
  pricingItems: ProductPricingSelectorItem[]
  selectedPricingItem?: ProductPricingSelectorItem
  stickyEditionDropdownItems: DropdownMenuItem[]
  checkoutButtonProps: {
    variant: 'subtle' | 'solid' | 'outline'
    label: string
  }
  canBePurchased: boolean
  isPurchasing: boolean
  isInBookList: boolean
  isCheckingBookList: boolean
  isUpdatingBookList: boolean
}
