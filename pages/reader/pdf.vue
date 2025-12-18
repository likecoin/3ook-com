<template>
  <main>
    <BookLoadingScreen
      v-if="isReaderLoading"
      :book-name="bookInfo.name.value"
      :book-cover-src="bookCoverSrc"
      :loading-label="loadingLabel"
    />
    <ClientOnly v-else-if="fileBuffer">
      <PDFReader
        ref="pdfReaderRef"
        class="grow w-full"
        :book-name="bookInfo.name.value"
        :nft-class-id="nftClassId"
        :pdf-buffer="fileBuffer"
        :is-audio-hidden="bookInfo.isAudioHidden.value"
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
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
  bookProgressKeyPrefix,
} = useReader()
const { handleError } = useErrorHandler()

const fileBuffer = ref<ArrayBuffer | null>(null)
const activeTTSElementIndex = ref<number | undefined>()
const currentPageIndex = ref(1)
const pdfReaderRef = ref()

const { setTTSSegments, setChapterTitles, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
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

const { loadingLabel, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
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

async function handlePDFLoaded(pdfDocument: PDFDocumentProxy) {
  try {
    const { segments, chapterTitles } = await extractTTSSegmentsFromPDF(pdfDocument)
    setTTSSegments(segments)
    setChapterTitles(chapterTitles)
    currentPageIndex.value = pdfReaderRef.value?.currentPage || 1
  }
  catch (error) {
    console.warn('Failed to extract TTS segments from PDF:', error)
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
    }
    catch (error) {
      console.warn(`Failed to extract text from PDF page ${pageNum}:`, error)
    }
  }

  return { segments, chapterTitles }
}

function handlePageChanged(pageNumber: number) {
  currentPageIndex.value = pageNumber
  activeTTSElementIndex.value = undefined
}

function handleTTSPlay() {
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
