<template>
  <main>
    <BookLoadingScreen
      v-if="isReaderLoading"
      :book-name="bookInfo.name.value"
      :book-cover-src="bookCoverSrc"
      :loading-label="loadingLabel"
    />
    <div
      v-else
      class="relative flex flex-col w-full grow"
    >
      <ReaderHeader :book-name="bookInfo.name.value" />

      <iframe
        ref="reader"
        class="grow"
        :src="config.public.pdfViewerURL"
        style="border: none"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account' }))
}

const config = useRuntimeConfig()
const { t: $t } = useI18n()
const nftStore = useNFTStore()
const {
  nftClassId,
  nftId,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
} = useReader()
const { handleError } = useErrorHandler()

const fileBuffer = ref<ArrayBuffer | null>(null)
const iframeElementForPDFViewer = useTemplateRef<HTMLIFrameElement>('reader')
const isIframeReady = ref(false)
const isReaderLoading = ref(false)

const { loadingLabel, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  window.addEventListener('message', handlePDFViewerMessage)
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

onBeforeUnmount(() => {
  window.removeEventListener('message', handlePDFViewerMessage)
})

function handlePDFViewerMessage(event: MessageEvent) {
  if (event.origin !== config.public.pdfViewerOrigin) return

  if (event.data === 'ready') {
    isIframeReady.value = true
    if (fileBuffer.value) {
      loadFileBufferToPDFViewer(fileBuffer.value)
      fileBuffer.value = null
    }
  }
}

async function loadPDF() {
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value)
  if (!buffer) {
    return
  }

  if (isIframeReady.value) {
    loadFileBufferToPDFViewer(buffer)
  }
  else {
    // Set fileBuffer first and wait for iframe to be ready
    fileBuffer.value = buffer
  }
}

function loadFileBufferToPDFViewer(buffer: ArrayBuffer) {
  iframeElementForPDFViewer.value?.contentWindow?.postMessage(
    {
      action: 'openArrayBufferFile',
      data: {
        data: buffer,
        name: bookInfo.name.value,
        classId: nftClassId.value,
        nftId: nftId.value,
        wallet: user.value?.likeWallet,
      },
    },
    config.public.pdfViewerOrigin,
    [buffer],
  )
}
</script>
