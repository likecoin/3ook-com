import { TippingModal } from '#components'

export function useTipping() {
  const overlay = useOverlay()
  const modal = overlay.create(TippingModal)

  type TippingResult = { customPrice?: number }
  const openTippingModal = async (options: { avatar?: string, displayName?: string, currency?: string }) => {
    const result = await modal.open(options).result
    return result as TippingResult
  }

  return { modal, openTippingModal }
}
