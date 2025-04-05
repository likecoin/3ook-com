import { ErrorModal } from '#components'

export default function () {
  const overlay = useOverlay()
  const errorModal = overlay.create(ErrorModal)
  return errorModal
}
