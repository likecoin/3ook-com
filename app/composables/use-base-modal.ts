import { BaseModal } from '#components'

export default function useBaseModal() {
  const overlay = useOverlay()
  return overlay.create(BaseModal)
}
