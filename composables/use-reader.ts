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

  const bookInfo = useBookInfo({ nftClassId })

  const nftId = computed(() => {
    const id = getRouteQuery('nft_id')
    return id || bookInfo.firstUserOwnedNFTId.value
  })
  const fileIndex = computed(() => getRouteQuery('index', '0'))
  const shouldCustomMessageDisabled = computed(() => getRouteQuery('custom_message') === '0')

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileCacheKey = computed(() =>
    [
      config.public.cacheKeyPrefix,
      READER_CACHE_KEY,
      nftClassId.value,
      nftId.value,
      fileIndex.value,
      bookInfo.isCustomMessageEnabled.value ? '1' : '0',
    ].filter(value => value !== undefined).join('-'),
  )

  // Progress/config key prefix - per NFT class only (not per NFT ID or custom message)
  const bookProgressKeyPrefix = computed(() =>
    getBookProgressKeyPrefix({
      nftClassId: nftClassId.value,
      cacheKeyPrefix: config.public.cacheKeyPrefix,
    }),
  )

  const bookFileURLWithCORS = computed(() =>
    getBookFileURLWithCORS({
      nftClassId: nftClassId.value,
      nftId: nftId.value,
      fileIndex: fileIndex.value,
      isCustomMessageEnabled: !shouldCustomMessageDisabled.value && bookInfo.isCustomMessageEnabled.value,
    }),
  )

  return {
    nftClassId,
    nftId,
    fileIndex,

    bookInfo,
    bookCoverSrc,

    bookFileCacheKey,
    bookProgressKeyPrefix,
    bookFileURLWithCORS,
  }
}
