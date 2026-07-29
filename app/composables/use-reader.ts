export default function (params: {
  nftClassId?: Ref<string> | string
} = {}) {
  const config = useRuntimeConfig()
  const getRouteQuery = useRouteQuery()
  const { getResizedImageURL } = useImageResize()
  const getBookFileURLWithCORS = useBookFileURLWithCORS()

  const nftClassId = computed(() =>
    getRouteQuery('nft_class_id') || toValue(params.nftClassId) || '',
  )

  const isUploadedBook = computed(() => getRouteQuery('source') === 'upload')

  const bookInfo = isUploadedBook.value
    ? useUploadedBookInfo({ bookId: nftClassId })
    : useBookInfo({ nftClassId })

  // Reflects route intent only; entitlement is enforced by the reader.vue
  // gate and ultimately by the server when fetching the truncated file.
  const isPreviewMode = computed(() =>
    !isUploadedBook.value && getRouteQuery('preview') === '1',
  )

  // A preview reader owns no copy, so the shelf can't show the book they were
  // reading: exit to the product page instead, where they can still buy it.
  const backRoute = computed(() => {
    if (!isPreviewMode.value || !('getProductPageRoute' in bookInfo)) return undefined
    return bookInfo.getProductPageRoute({
      llMedium: 'preview-back',
      llSource: 'reader',
    })
  })

  const nftId = computed(() => {
    if (isUploadedBook.value) return undefined
    // The preview file variant conflicts with nft_id server-side.
    if (isPreviewMode.value) return undefined
    const id = getRouteQuery('nft_id')
    return id || ('firstUserOwnedNFTId' in bookInfo ? bookInfo.firstUserOwnedNFTId.value : undefined)
  })
  const fileIndex = computed(() => getRouteQuery('index', '0'))
  const shouldCustomMessageDisabled = computed(() => getRouteQuery('custom_message') === '0')

  // Single source of truth for both the file URL and its cache key, so the two
  // can't disagree. A preview file never carries a custom message.
  const isCustomMessageEnabled = computed(() =>
    !isPreviewMode.value
    && !shouldCustomMessageDisabled.value
    && bookInfo.isCustomMessageEnabled.value,
  )

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileCacheKey = computed(() => getBookFileCacheKey({
    cacheKeyPrefix: config.public.cacheKeyPrefix,
    nftClassId: nftClassId.value,
    nftId: nftId.value,
    fileIndex: fileIndex.value,
    isCustomMessageEnabled: isCustomMessageEnabled.value,
    isUploadedBook: isUploadedBook.value,
    isPreview: isPreviewMode.value,
  }))

  // Progress/config key prefix - per book ID (NFT class or uploaded book)
  const bookProgressKeyPrefix = computed(() =>
    getBookProgressKeyPrefix({
      nftClassId: nftClassId.value,
      cacheKeyPrefix: config.public.cacheKeyPrefix,
    }),
  )

  const bookFileURLWithCORS = computed(() => {
    if (isUploadedBook.value) {
      return `/api/uploaded-books/${nftClassId.value}/file`
    }
    return getBookFileURLWithCORS({
      nftClassId: nftClassId.value,
      nftId: nftId.value,
      fileIndex: fileIndex.value,
      isCustomMessageEnabled: isCustomMessageEnabled.value,
      isPreview: isPreviewMode.value,
    })
  })

  return {
    nftClassId,
    nftId,
    fileIndex,
    isUploadedBook,
    isPreviewMode,
    backRoute,

    bookInfo,
    bookCoverSrc,

    bookFileCacheKey,
    bookProgressKeyPrefix,
    bookFileURLWithCORS,
  }
}
