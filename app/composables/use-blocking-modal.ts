import { BlockingModal } from '#components'

export default function useBlockingModal() {
  const overlay = useOverlay()
  const modal = overlay.create(BlockingModal)
  return modal
}
