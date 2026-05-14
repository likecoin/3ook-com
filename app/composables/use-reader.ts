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

  const nftId = computed(() => {
    if (isUploadedBook.value) return undefined
    const id = getRouteQuery('nft_id')
    return id || ('firstUserOwnedNFTId' in bookInfo ? bookInfo.firstUserOwnedNFTId.value : undefined)
  })
  const fileIndex = computed(() => getRouteQuery('index', '0'))
  const shouldCustomMessageDisabled = computed(() => getRouteQuery('custom_message') === '0')

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileCacheKey = computed(() => {
    if (isUploadedBook.value) {
      return [config.public.cacheKeyPrefix, READER_CACHE_KEY, 'upload', nftClassId.value].join('-')
    }
    return [
      config.public.cacheKeyPrefix,
      READER_CACHE_KEY,
      nftClassId.value,
      nftId.value,
      fileIndex.value,
      bookInfo.isCustomMessageEnabled.value ? '1' : '0',
    ].filter(value => value !== undefined).join('-')
  })

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
      isCustomMessageEnabled: !shouldCustomMessageDisabled.value && bookInfo.isCustomMessageEnabled.value,
    })
  })

  return {
    nftClassId,
    nftId,
    fileIndex,
    isUploadedBook,

    bookInfo,
    bookCoverSrc,

    bookFileCacheKey,
    bookProgressKeyPrefix,
    bookFileURLWithCORS,
  }
}
