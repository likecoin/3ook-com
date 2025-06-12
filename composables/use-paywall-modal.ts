import { PaywallModal } from '#components'

export function usePayWall({ isFullScreen = false, dismissible = true }: { isFullScreen?: boolean, dismissible?: boolean } = {}) {
  const overlay = useOverlay()
  const modal = overlay.create(PaywallModal, {
    props: {
      isFullScreen,
      dismissible,
    },
  })
  return modal
}
