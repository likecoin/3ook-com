import { PaywallModal } from '#components'

export function usePayWall({
  isFullScreen = false,
  dismissible = true,
  originalYearlyPrice = '119.88',
  originalMonthlyPrice = '9.99',
  discountedYearlyPrice = '69.99',
  discountedMonthlyPrice = '6.99',
}: {
  isFullScreen?: boolean
  dismissible?: boolean
  originalYearlyPrice?: string | number
  originalMonthlyPrice?: string | number
  discountedYearlyPrice?: string | number
  discountedMonthlyPrice?: string | number
} = {}) {
  const overlay = useOverlay()
  const modal = overlay.create(PaywallModal, {
    props: {
      isFullScreen,
      dismissible,
      originalYearlyPrice,
      originalMonthlyPrice,
      discountedYearlyPrice,
      discountedMonthlyPrice,
    },
  })
  return modal
}
