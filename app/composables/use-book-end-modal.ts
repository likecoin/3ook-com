import { BookEndModal } from '#components'
import type { BookEndModalResult } from '~/components/BookEndModal.props'

/**
 * End-of-book prompt shared by the EPUB and PDF readers, opened once per read.
 * Disabled for previews (they have their own CTA, see `usePreviewEndModal`)
 * and for uploaded books, which have neither a shelf status nor a store page.
 */
export function useBookEndModal(params: {
  nftClassId: MaybeRef<string>
  isLibraryBook: Ref<boolean>
  isEnabled: boolean
}) {
  if (!params.isEnabled) {
    return { handleBookEndBoundary: (_isAtEnd: boolean) => {} }
  }

  const bookInfo = useBookInfo({ nftClassId: params.nftClassId })

  const overlay = useOverlay()
  const modal = overlay.create(BookEndModal)
  // Once per read: re-reading the last pages must not re-prompt.
  let hasShown = false
  // Arm only once the reader has been somewhere before the end, so restoring
  // a saved last-page position (or clamping onto it) never prompts.
  let isArmed = false

  async function openBookEndModal() {
    if (hasShown) return
    hasShown = true

    const nftClassId = toValue(params.nftClassId)
    const isBorrowed = params.isLibraryBook.value
    useLogEvent('reader_book_end_modal_open', {
      nft_class_id: nftClassId,
      is_borrowed: isBorrowed,
    })

    const result = await modal.open({ isBorrowed }).result as BookEndModalResult | undefined

    if (result === 'collect') {
      useLogEvent('reader_book_end_collect_click', { nft_class_id: nftClassId })
      await navigateTo(bookInfo.getProductPageRoute({
        llMedium: 'book-end',
        llSource: 'reader',
      }))
    }
  }

  function handleBookEndBoundary(isAtEnd: boolean) {
    if (!isAtEnd) {
      isArmed = true
      return
    }
    if (isArmed) void openBookEndModal()
  }

  return { handleBookEndBoundary }
}
