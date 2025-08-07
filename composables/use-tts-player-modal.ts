import { EpubCFI } from '@likecoin/epubjs'
import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'

interface TTSPlayerOptions {
  nftClassId?: string
  onSegmentChange?: (segment: { id?: string, text?: string, href?: string, index?: number } | undefined) => void
}

export function useTTSPlayerModal(options: TTSPlayerOptions = {}) {
  const ttsSegments = ref<TTSSegment[]>([])
  const startIndex = ref(0)
  const bookInfo = useBookInfo({ nftClassId: options.nftClassId })
  const bookCoverSrc = computed(() =>
    getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }),
  )

  const ttsPlayerModalProps = computed<TTSPlayerModalProps>(() => ({
    bookTitle: bookInfo.name.value,
    bookCoverSrc: bookCoverSrc.value,
    bookAuthorName: bookInfo.authorName.value,
    bookLanguage: bookInfo.inLanguage.value,
    nftClassId: options.nftClassId,
    segments: ttsSegments.value,
    startIndex: startIndex.value,
    onSegmentChange: options.onSegmentChange,
  }))

  const overlay = useOverlay()
  const modal = overlay.create(TTSPlayerModal, {
    props: ttsPlayerModalProps.value,
  })

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  function openPlayer({
    ttsIndex,
    sectionIndex,
    cfi,
  }: {
    ttsIndex?: number
    sectionIndex?: number
    cfi?: string
  } = {}) {
    if (ttsIndex !== undefined) {
      ttsPlayerModalProps.value.startIndex = ttsIndex
    }
    else if (sectionIndex !== undefined || cfi) {
      let segmentIndex = 0
      if (sectionIndex !== undefined) {
        segmentIndex = ttsSegments.value.findIndex(
          segment => segment.sectionIndex >= sectionIndex,
        )
        segmentIndex = Math.max(segmentIndex, 0)
      }
      if (cfi) {
        const epubCFI = new EpubCFI()
        const cfiIndex = ttsSegments.value
          .slice(segmentIndex)
          .findIndex(segment => segment.cfi && epubCFI.compare(segment.cfi, cfi) >= 0)
        if (cfiIndex >= 1) {
          // Retrieve the previous segment for better UX, as the segment might span multiple pages
          segmentIndex += cfiIndex - 1
        }
      }
      ttsPlayerModalProps.value.startIndex = segmentIndex
    }
    else {
      ttsPlayerModalProps.value.startIndex = 0
    }
    modal.open(ttsPlayerModalProps.value)
  }

  function updateTTSPlayerModalProps(
    overrideProps: Partial<TTSPlayerModalProps> = {},
  ) {
    const baseProps = ttsPlayerModalProps.value
    const mergedProps = { ...baseProps, ...overrideProps }
    modal.patch(mergedProps)
  }

  return {
    modal,
    openPlayer,
    updateTTSPlayerModalProps,

    ttsSegments,
    setTTSSegments,
  }
}
