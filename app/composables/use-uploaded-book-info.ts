export default function (
  { bookId }: { bookId: string | Ref<string> | ComputedRef<string> },
) {
  const localeRoute = useLocaleRoute()
  const uploadedBooksStore = useUploadedBooksStore()

  const book = computed(() => uploadedBooksStore.getBook(toValue(bookId)))

  const name = computed(() => book.value?.name || '')
  const coverSrc = computed(() => book.value?.coverURL || '')
  const contentType = computed(() => book.value?.contentType || 'epub')

  const contentURLs = computed<ContentURL[]>(() => {
    const id = toValue(bookId)
    if (!book.value) return []
    return [{
      url: `/api/uploaded-books/${id}/file`,
      name: book.value.name,
      type: book.value.contentType,
      index: 0,
    }]
  })

  const defaultContentURL = computed(() => contentURLs.value[0])

  const getReaderRoute = computed(() => ({
    contentURL: inputContentURL,
  }: {
    contentURL?: ContentURL
  } = {}) => {
    const contentURL = inputContentURL || defaultContentURL.value
    if (!contentURL) return undefined
    return localeRoute({
      name: `reader-${contentURL.type}`,
      query: {
        nft_class_id: toValue(bookId),
        source: 'upload',
      },
    })
  })

  // Properties that don't apply to uploaded books
  const isAudioHidden = computed(() => false)
  const isCustomMessageEnabled = computed(() => false)
  const isDownloadable = computed(() => false)
  const isUpsellDisabled = computed(() => true)
  const authorName = computed(() => '')
  const inLanguage = computed(() => 'zh')
  const sortedContentURLs = computed(() => contentURLs.value)

  return {
    book,
    name,
    coverSrc,
    contentType,
    contentURLs,
    sortedContentURLs,
    defaultContentURL,
    getReaderRoute,
    isAudioHidden,
    isCustomMessageEnabled,
    isDownloadable,
    isUpsellDisabled,
    authorName,
    inLanguage,
  }
}
