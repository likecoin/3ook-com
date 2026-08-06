import { PreviewEndModal } from '#components'
import type { PreviewEndModalResult } from '~/components/PreviewEndModal.props'

type PreviewEndModalTrigger = 'page-end' | 'toc'

/**
 * End-of-preview CTA shared by the EPUB and PDF readers: opened when a 試閱
 * reader reaches the truncated file's end (or taps a dropped ToC chapter),
 * it offers purchasing the book or, for Plus-reading books, subscribing.
 * Pass `isEnabled: false` outside preview mode to get inert no-ops — this
 * skips building the paywall modal stack (and its app-lifetime overlay
 * entries) on the vast majority of reader mounts that never show the CTA.
 */
export function usePreviewEndModal(params: {
  nftClassId: MaybeRef<string>
  isEnabled: boolean
}) {
  if (!params.isEnabled) {
    return {
      openPreviewEndModal: async (_trigger: PreviewEndModalTrigger) => {},
      handlePreviewEndBoundary: (_isAtEnd: boolean) => {},
    }
  }

  const route = useRoute()
  const getRouteBaseNameString = useRouteBaseNameString()
  const bookInfo = useBookInfo({ nftClassId: params.nftClassId })
  const { openPaywallModal } = useSubscriptionModal()

  const overlay = useOverlay()
  const modal = overlay.create(PreviewEndModal)
  // The handle's `isOpen` is a static snapshot in @nuxt/ui's useOverlay, so
  // track re-entrancy locally: repeated ToC taps must not stack opens (each
  // open would orphan the previous await's pending result).
  let isModalOpen = false
  // Show once per landing on the end boundary; re-armed on leaving it.
  let hasShownForCurrentLanding = false

  async function openPreviewEndModal(trigger: PreviewEndModalTrigger) {
    if (isModalOpen) return
    const nftClassId = toValue(params.nftClassId)
    useLogEvent('reader_preview_end_modal_open', {
      nft_class_id: nftClassId,
      trigger,
    })

    isModalOpen = true
    let result: PreviewEndModalResult | undefined
    try {
      result = await modal.open({
        isPlusReadingEnabled: bookInfo.isPlusReadingEnabled.value,
      }).result as PreviewEndModalResult | undefined
    }
    finally {
      isModalOpen = false
    }

    if (result === 'purchase') {
      useLogEvent('reader_preview_end_purchase_click', { nft_class_id: nftClassId })
      await navigateTo(bookInfo.getProductPageRoute({
        llMedium: 'preview-end',
        llSource: 'reader',
      }))
    }
    else if (result === 'subscribe') {
      useLogEvent('reader_preview_end_subscribe_click', { nft_class_id: nftClassId })
      // After subscribing, reopen the reader without the preview param so the
      // entry gate resumes this book as a full Plus-library borrow.
      const query = { ...route.query }
      delete query.preview
      await openPaywallModal({
        checkoutPlacement: 'preview-end',
        redirectRoute: {
          name: getRouteBaseNameString(),
          query,
        },
      })
    }
  }

  function handlePreviewEndBoundary(isAtEnd: boolean) {
    if (isAtEnd && !hasShownForCurrentLanding) {
      void openPreviewEndModal('page-end')
    }
    hasShownForCurrentLanding = isAtEnd
  }

  return { openPreviewEndModal, handlePreviewEndBoundary }
}
