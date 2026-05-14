import { TippingModal } from '#components'

export function useTipping() {
  const overlay = useOverlay()
  const modal = overlay.create(TippingModal)

  type TippingResult = { tippingAmount?: number }
  const open = async (props: { avatar?: string, displayName?: string, currency?: string }) => {
    const result = await modal.open(props).result
    return result as TippingResult
  }

  return { modal, open }
}
