export interface ProductActionButtonsProps {
  isLibrary: boolean
  isUserBookOwner: boolean
  isCheckoutVisible: boolean
  checkoutButtonProps: {
    variant: 'subtle' | 'solid' | 'outline'
    label: string
  }
  canBePurchased: boolean
  isPurchasing: boolean
  isCartCtaVisible: boolean
  bookListButtonProps: {
    icon: string
    label: string
  }
  isBookListLoading: boolean
  isGiftCtaVisible: boolean
  readButtonVariant: 'outline' | 'solid'
  isPlusReadingCtaVisible: boolean
  plusReadingCtaLabel: string
  plusReadingCtaIcon?: string
  plusReadingCtaVariant: 'outline' | 'solid'
  isPreviewCtaVisible: boolean
  // The desktop card uses xl; the sticky bar keeps the default size.
  size?: 'xl'
}
