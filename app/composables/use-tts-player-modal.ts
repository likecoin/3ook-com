import { EpubCFI } from '@likecoin/epub-ts'
import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'
import { isUploadedBookId } from '~~/shared/utils/uploaded-book'

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
        isStoredIndexStale = !isCFIWithinPageRange(epubCFI, storedSegmentCFI, cfi, pageEndCFI)
      }
      catch {
        // Treat malformed/unsupported CFIs as stale so we fall back to the
        // cfi/sectionIndex lookup instead of failing to open the player.
        isStoredIndexStale = true
      }
    }

    // First TTS segment at or after the reader's current section (so an
    // image-only section with no segments resolves to the next section that
    // has them). 0 when there's no section index; when the section is past
    // every segment (e.g. trailing image-only pages) fall back to the last
    // segment rather than restarting from the book's start. Used by the cfi
    // fallbacks and the no-page-cfi path.
    const firstSegmentOfSection = () => {
      if (sectionIndex === undefined || ttsSegments.value.length === 0) return 0
      const index = ttsSegments.value.findIndex(
        segment => segment.sectionIndex >= sectionIndex,
      )
      return index === -1 ? ttsSegments.value.length - 1 : index
    }

    if (ttsIndex !== undefined && !isStoredIndexStale) {
      startIndex.value = ttsIndex
    }
    else if (cfi) {
      const segments = ttsSegments.value
      let segmentIndex = 0
      try {
        // epub.js can report an inconsistent page range — start cfi *after*
        // end cfi — for a reflowable chapter wedged between fixed-layout
        // image spreads. The page cfi is then garbage, so anchor on the
        // section the reader actually opened.
        if (pageEndCFI && epubCFI.compare(cfi, pageEndCFI) > 0) {
          segmentIndex = firstSegmentOfSection()
        }
        else {
          // Anchor on the page-start cfi across ALL segments, not a
          // `sectionIndex >= currentSection` seed: a cfi embeds its spine
          // position so it still resolves when the current spine item has no
          // segments (full-page image spreads between text pages), whereas
          // the seed could only skip forward to the next text section
          // ("read → listen jumps to next section" bug).
          const pageCFI = new EpubCFI(cfi)
          let lastAtOrBefore = -1
          let firstAfter = -1
          for (let i = 0; i < segments.length; i++) {
            const segmentCFI = segments[i]?.cfi
            if (!segmentCFI) continue // cfi is optional on TTSSegment
            if (epubCFI.compare(segmentCFI, pageCFI) <= 0) {
              lastAtOrBefore = i
            }
            else {
              firstAfter = i
              break
            }
          }
          segmentIndex = lastAtOrBefore >= 0 ? lastAtOrBefore : Math.max(firstAfter, 0)
          // A block split into multiple segments shares one element cfi; rewind
          // to the first so playback starts at the block top, not mid-way.
          const anchorCFI = segments[segmentIndex]?.cfi
          while (segmentIndex > 0 && segments[segmentIndex - 1]?.cfi === anchorCFI) {
            segmentIndex--
          }
        }
      }
      catch {
        // Malformed/unsupported cfi — fall back to the section start.
        segmentIndex = firstSegmentOfSection()
      }
      startIndex.value = segmentIndex
    }
    else if (sectionIndex !== undefined) {
      // No rendered page cfi to anchor on — fall back to the section start.
      startIndex.value = firstSegmentOfSection()
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
