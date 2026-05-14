import { WIPModal } from '#components'

export function useWIPModal({ title = '' }: { title?: string } = {}) {
  const overlay = useOverlay()
  const modal = overlay.create(WIPModal, {
    props: {
      title,
    },
  })
  return modal
}
