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
        class="grow w-full"
        :book-name="bookInfo.name.value"
        :pdf-buffer="fileBuffer"
        :book-file-cache-key="bookFileCacheKey"
        @error="handlePDFError"
      />
    </ClientOnly>
  </main>
</template>

<script setup lang="ts">
const { loggedIn: hasLoggedIn } = useUserSession()
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account' }))
}

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const {
  nftClassId,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
} = useReader()
const { handleError } = useErrorHandler()

const fileBuffer = ref<ArrayBuffer | null>(null)
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

function handlePDFError(error: Error) {
  handleError(error, {
    title: $t('error_reader_load_pdf_failed'),
    onClose: () => {
      navigateTo(localeRoute({ name: 'shelf' }))
    },
  })
}
</script>
