import { EpubCFI } from '@likecoin/epub-ts'
import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'
import { isUploadedBookId } from '~/shared/utils/uploaded-book'

interface TTSPlayerOptions {
  nftClassId: MaybeRef<string>
  onSegmentChange?: (segment: TTSSegment & { index: number, isResync?: boolean }) => void
  onClose?: () => void
}

export function useTTSPlayerModal(options: TTSPlayerOptions) {
  const ttsSegments = ref<TTSSegment[]>([])
  const chapterTitlesBySection = ref<Record<number, string>>({})
  const startIndex = ref(0)
  // Uploaded books aren't on-chain, so `useBookInfo` has no bookstore/NFT
  // record to read — dispatch to the uploaded-book composable so the TTS
  // player header shows the correct title/cover/author.
  const bookInfo = isUploadedBookId(toValue(options.nftClassId))
    ? useUploadedBookInfo({ bookId: options.nftClassId })
    : useBookInfo({ nftClassId: options.nftClassId })
  const { getResizedImageURL } = useImageResize()
  const bookCoverSrc = computed(() =>
    getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }),
  )

  const ttsPlayerModalProps = computed(() => ({
    bookTitle: bookInfo.name.value,
    bookCoverSrc: bookCoverSrc.value,
    bookAuthorName: bookInfo.authorName.value,
    bookLanguage: bookInfo.inLanguage.value,
    nftClassId: toValue(options.nftClassId),
    segments: ttsSegments.value,
    chapterTitlesBySection: chapterTitlesBySection.value,
    startIndex: startIndex.value,
    onSegmentChange: options.onSegmentChange,
    onClose: options.onClose,
  }))

  const overlay = useOverlay()
  const modal = overlay.create(TTSPlayerModal, {
    props: ttsPlayerModalProps.value,
  })

  const route = useRoute()
  watch(() => route.path, () => {
    modal.close()
  })

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  function setChapterTitles(titles: Record<number, string>) {
    chapterTitlesBySection.value = titles
  }

  function openPlayer({
    ttsIndex,
    sectionIndex,
    cfi,
    pageEndCFI,
    ...props
  }: {
    ttsIndex?: number
    sectionIndex?: number
    cfi?: string
    pageEndCFI?: string
  } & TTSPlayerModalProps = {}) {
    const epubCFI = new EpubCFI()
    // A persisted ttsIndex can outlive a reader navigation that didn't clear
    // it (search/annotation jump), so only honor it when the page range says
    // its segment is still on-screen. Otherwise fall through to the cfi
    // lookup so TTS starts where the user is actually reading.
    const storedSegmentCFI = ttsIndex !== undefined
      ? ttsSegments.value[ttsIndex]?.cfi
      : undefined
    let isStoredIndexStale = false
    if (storedSegmentCFI && cfi && pageEndCFI) {
      try {
        isStoredIndexStale = epubCFI.compare(storedSegmentCFI, cfi) < 0
          || epubCFI.compare(storedSegmentCFI, pageEndCFI) > 0
      }
      catch {
        // Treat malformed/unsupported CFIs as stale so we fall back to the
        // cfi/sectionIndex lookup instead of failing to open the player.
        isStoredIndexStale = true
      }
    }

    if (ttsIndex !== undefined && !isStoredIndexStale) {
      startIndex.value = ttsIndex
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
        // Constrain the cfi search to the current section. Without this,
        // when the user's section has few or no matching segments, the
        // search would silently resolve into the next chapter.
        const sectionToStayIn = ttsSegments.value[segmentIndex]?.sectionIndex
        let foundIndex = -1
        for (let i = segmentIndex; i < ttsSegments.value.length; i++) {
          const segment = ttsSegments.value[i]
          if (!segment) continue
          if (sectionToStayIn !== undefined && segment.sectionIndex > sectionToStayIn) break
          if (segment.cfi && epubCFI.compare(segment.cfi, cfi) >= 0) {
            foundIndex = i
            break
          }
        }
        if (foundIndex > segmentIndex) {
          // Retrieve the previous segment for better UX, as the segment might span multiple pages
          segmentIndex = foundIndex - 1
        }
      }
      startIndex.value = segmentIndex
    }
    else {
      startIndex.value = 0
    }
    modal.open({ ...ttsPlayerModalProps.value, ...props })
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
    setChapterTitles,
  }
}
