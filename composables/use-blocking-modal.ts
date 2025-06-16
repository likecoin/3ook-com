import { BlockingModal } from '#components'

export default function useBlackingModal() {
  const overlay = useOverlay()
  const modal = overlay.create(BlockingModal)
  return modal
}
