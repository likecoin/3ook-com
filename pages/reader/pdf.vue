<template>
  <main class="relative">
    <Transition name="reader-load">
      <BookLoadingScreen
        v-if="isReaderLoading"
        class="absolute inset-0 z-10 bg-background"
        cover-class="mt-[8vh]"
        :book-name="bookInfo.name.value"
        :book-cover-src="bookCoverSrc"
        :loading-label="loadingLabel"
        :loading-progress="loadingPercentage"
      />
    </Transition>
    <ClientOnly v-if="(fileBuffer || isPDFReady) && !isReaderLoading">
      <PDFReader
        ref="pdfReaderRef"
        class="grow w-full"
        :book-name="bookInfo.name.value"
        :nft-class-id="nftClassId"
        :pdf-buffer="fileBuffer"
        :is-audio-hidden="bookInfo.isAudioHidden.value"
        :is-tts-extracting="isTTSExtracting"
        :book-file-cache-key="bookFileCacheKey"
        :book-progress-key-prefix="bookProgressKeyPrefix"
        @error="handlePDFError"
        @pdf-loaded="handlePDFLoaded"
        @tts-play="handleTTSPlay"
        @page-changed="handlePageChanged"
      />
    </ClientOnly>
  </main>
</template>

<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

// Force a fresh page instance when switching between NFT and uploaded books:
// useReader() branches on the `source` query at setup, so a within-route
// navigation that flips source would otherwise leave `bookInfo` pointing at
// the wrong composable.
definePageMeta({
  key: route => `reader-pdf-${route.query.source === 'upload' ? 'upload' : 'nft'}`,
})

const { loggedIn: hasLoggedIn } = useUserSession()
const route = useRoute()
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account', query: route.query }))
}

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const {
  nftClassId,
  isUploadedBook,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
  bookProgressKeyPrefix,
} = useReader()
const { fetchCustomVoice } = useCustomVoice()
const { fetchConfig: fetchPlusAffiliateConfig } = usePlusAffiliate()
onMounted(() => {
  if (hasLoggedIn.value) {
    fetchCustomVoice()
    fetchPlusAffiliateConfig()
  }
})
const { handleError } = useErrorHandler()

const pdfProgress = ref(0)
function updatePDFProgress(page: number) {
  const totalPages = loadedPDFDocument.value?.numPages || 1
  pdfProgress.value = Math.round((page / totalPages) * 100)
}
const currentPageIndex = ref(1)
const { isTTSPlaying } = useTTSPlayingState()
// Uploaded books aren't on-chain, so they have no publisher analytics
// pipeline to feed — skip per-book reading session reporting for them.
if (!isUploadedBook.value) {
  useReadingSession({
    nftClassId,
    readerType: 'pdf',
    progress: pdfProgress,
    isTextToSpeechPlaying: isTTSPlaying,
    pageIndex: currentPageIndex,
  })
}

const fileBuffer = ref<ArrayBuffer | null>(null)
const isPDFReady = ref(false)
const loadedPDFDocument = shallowRef<PDFDocumentProxy>()
const isTTSExtracting = ref(false)
const activeTTSElementIndex = ref<number | undefined>()
const pdfReaderRef = ref()

const { isTTSQueryParam, setTTSQueryParam } = useTTSQueryParam()

const { setTTSSegments, setChapterTitles, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
  onClose: () => setTTSQueryParam(false),
  onSegmentChange: (segment) => {
    if (segment) {
      const newPageIndex = segment.sectionIndex
      if (newPageIndex !== currentPageIndex.value) {
        currentPageIndex.value = newPageIndex
        activeTTSElementIndex.value = segment.index
        if (pdfReaderRef.value?.goToPage) {
          pdfReaderRef.value.goToPage(newPageIndex)
        }
      }
    }
  },
})
const isReaderLoading = ref(true)

const { loadingLabel, loadingPercentage, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  try {
    if (isUploadedBook.value) {
      const uploadedBooksStore = useUploadedBooksStore()
      if (!uploadedBooksStore.hasFetched) {
        await uploadedBooksStore.fetchItems()
      }
    }
    else {
      await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_reader_fetch_metadata_failed'),
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
    return
  }

  try {
    await loadPDF()
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_reader_load_pdf_failed'),
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
  }
  isReaderLoading.value = false
})

async function loadPDF() {
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value, bookFileCacheKey.value)
  if (!buffer) {
    return
  }
  fileBuffer.value = buffer
}

function handlePDFLoaded(pdfDocument: PDFDocumentProxy) {
  isPDFReady.value = true
  loadedPDFDocument.value = pdfDocument
  currentPageIndex.value = pdfReaderRef.value?.currentPage || 1
  updatePDFProgress(currentPageIndex.value)
  // Release the ArrayBuffer — PDF.js has its own internal copy
  fileBuffer.value = null

  if (isTTSQueryParam.value) {
    if (bookInfo.isAudioHidden.value) {
      setTTSQueryParam(false)
    }
    else {
      handleTTSPlay()
    }
  }
}

async function extractTTSSegmentsFromPDF(pdfDocument: PDFDocumentProxy) {
  const segments: TTSSegment[] = []
  const chapterTitles: Record<number, string> = {}

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const viewport = page.getViewport({ scale: 1.0 })
      const pageHeight = viewport.height

      const headerThreshold = pageHeight * 0.9
      const footerThreshold = pageHeight * 0.1

      const mainContentItems = textContent.items
        .filter((item: TextItem | TextMarkedContent) => {
          if (!('str' in item) || !item.transform) return false
          // item.transform[5] is the Y coordinate (from bottom of page)
          const yPosition = item.transform[5]
          return yPosition < headerThreshold && yPosition > footerThreshold
        })

      const pageText = mainContentItems
        .filter((item: (TextItem | TextMarkedContent)) => 'str' in item)
        .map((item: TextItem) => item.str)
        .join(' ')
        .trim()

      if (pageText) {
        const textSegments = splitTextIntoSegments(pageText)
        const pageSegments = textSegments.map((segment: string, index: number) => ({
          id: `page-${pageNum}-segment-${index}`,
          text: segment,
          sectionIndex: pageNum,
        }))
        segments.push(...pageSegments)

        // Use page number as chapter title for PDFs
        chapterTitles[pageNum] = `Page ${pageNum}`
      }

      page.cleanup()
    }
    catch (error) {
      console.warn(`Failed to extract text from PDF page ${pageNum}:`, error)
    }
  }

  return { segments: mergeShortTTSSegments(segments), chapterTitles }
}

function handlePageChanged(pageNumber: number) {
  currentPageIndex.value = pageNumber
  activeTTSElementIndex.value = undefined
  updatePDFProgress(pageNumber)
}

let ttsExtractionPromise: Promise<void> | undefined
async function ensureTTSExtracted() {
  if (!loadedPDFDocument.value) return
  if (!ttsExtractionPromise) {
    isTTSExtracting.value = true
    ttsExtractionPromise = extractTTSSegmentsFromPDF(loadedPDFDocument.value)
      .then(({ segments, chapterTitles }) => {
        setTTSSegments(segments)
        setChapterTitles(chapterTitles)
      })
      .catch((error) => {
        console.warn('Failed to extract TTS segments from PDF:', error)
        ttsExtractionPromise = undefined
      })
      .finally(() => {
        isTTSExtracting.value = false
      })
  }
  await ttsExtractionPromise
}

async function handleTTSPlay() {
  await ensureTTSExtracted()
  setTTSQueryParam(true)
  openPlayer({
    ttsIndex: activeTTSElementIndex.value,
    sectionIndex: currentPageIndex.value,
  })
}

function handlePDFError(error: Error) {
  handleError(error, {
    title: $t('error_reader_load_pdf_failed'),
    onClose: () => {
      navigateTo(localeRoute({ name: 'shelf' }))
    },
  })
}
</script>
