import { EpubCFI } from '@likecoin/epub-ts'
import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'
import { isUploadedBookId } from '~~/shared/utils/uploaded-book'

interface TTSPlayerOptions {
  nftClassId: MaybeRef<string>
  isLibraryBook?: MaybeRef<boolean>
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
    isLibraryBook: toValue(options.isLibraryBook),
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

  // `overlay.create` snapshots props once, but the reader confirms
  // `isLibraryBook` asynchronously — sync it so an open player doesn't tag TTS
  // analytics with the stale initial value. Harmless when the modal is closed.
  watch(() => toValue(options.isLibraryBook), () => {
    updateTTSPlayerModalProps()
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

    // Resolve a page/anchor cfi to the segment whose start it most recently
    // passed (lastAtOrBefore), else the first segment after it; -1 when no
    // segment is comparable.
    //
    // Segment cfis are NOT strictly ascending, so this must scan every segment
    // and never break early: a paragraph that opens with an inline element
    // (e.g. the decorative drop-cap `<span>O</span>` some books put before the
    // first letter) gives its first segment a cfi that descends into that span
    // (…/2/1:0). epub.js numbers a paragraph's body text as its first *text*
    // node — step /1 — while the leading span is element step /2, and compare()
    // sorts /2 after /1. So that drop-cap segment sorts *after* the paragraph's
    // own body text. Breaking on the first cfi past the target would stop at
    // the next paragraph's drop-cap segment and strand the result on the
    // previous paragraph's last segment (TTS starting a page too early).
    const scanSegmentByCFI = (targetCFI: string): number => {
      const target = new EpubCFI(targetCFI)
      let lastAtOrBefore = -1
      let firstAfter = -1
      for (let i = 0; i < ttsSegments.value.length; i++) {
        const segmentCFI = ttsSegments.value[i]?.cfi
        if (!segmentCFI) continue // cfi is optional on TTSSegment
        if (epubCFI.compare(segmentCFI, target) <= 0) {
          lastAtOrBefore = i
        }
        else if (firstAfter < 0) {
          firstAfter = i
        }
      }
      return lastAtOrBefore >= 0 ? lastAtOrBefore : firstAfter
    }

    if (ttsIndex !== undefined && !isStoredIndexStale) {
      startIndex.value = ttsIndex
    }
    else if (cfi) {
      let segmentIndex: number
      try {
        // Each segment carries its own text-range cfi (see extractTTSSegments
        // in pages/reader/epub.vue), so the scan resolves directly to the
        // segment whose start the page boundary most recently passed. epub-ts
        // ≥0.6.4 recomputes a fast-path-induced start/end range inversion at
        // the source (Mapping.page), so the page-start cfi is trustworthy and
        // no inconsistent-range workaround is needed here.
        const scanned = scanSegmentByCFI(cfi)
        segmentIndex = scanned >= 0 ? scanned : firstSegmentOfSection()
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
