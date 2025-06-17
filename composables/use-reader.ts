export default function (params: {
  nftClassId?: Ref<string> | string
} = {}) {
  const nftClassId = computed(() =>
    getRouteQuery('nft_class_id') || toValue(params.nftClassId) || '',
  )

  const bookInfo = useBookInfo({ nftClassId: nftClassId.value })

  const nftId = computed(() => {
    const id = getRouteQuery('nft_id')
    return id || bookInfo.firstUserOwnedNFTId.value
  })
  const fileIndex = computed(() => getRouteQuery('index', '0'))

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileCacheKey = computed(() =>
    ['book-file', nftClassId.value, nftId.value || '', fileIndex.value, bookInfo.isCustomMessageEnabled.value ? '1' : '0'].join('-'),
  )

  const bookFileURLWithCORS = computed(() =>
    getBookFileURLWithCORS({
      nftClassId: nftClassId.value,
      nftId: nftId.value,
      fileIndex: fileIndex.value,
      isCustomMessageEnabled: bookInfo.isCustomMessageEnabled.value,
    }),
  )

  return {
    nftClassId,
    nftId,
    fileIndex,

    bookInfo,
    bookCoverSrc,

    bookFileCacheKey,
    bookFileURLWithCORS,
  }
}
