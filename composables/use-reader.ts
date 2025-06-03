export default function () {
  const config = useRuntimeConfig()
  const { user } = useUserSession()
  const nftStore = useNFTStore()

  const nftClassId = computed(() => getRouteQuery('nft_class_id'))
  const bookInfo = useBookInfo({ nftClassId: nftClassId.value })

  const ownerFirstNFTId = computed(() => {
    return nftStore.getNFTClassFirstNFTIdByNFTClassIdAndOwnerWalletAddress(nftClassId.value, (bookInfo.isEVM.value ? user.value?.evmWallet : user.value?.likeWallet) || '')
  })

  const nftId = computed(() => getRouteQuery('nft_id') || ownerFirstNFTId.value)
  const filename = computed(() => getRouteQuery('filename'))
  const fileIndex = computed(() => getRouteQuery('index', '0'))

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileURLWithCORS = computed(() => {
    const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
    url.searchParams.set('class_id', nftClassId.value)
    url.searchParams.set('nft_id', nftId.value)
    url.searchParams.set('index', fileIndex.value)
    url.searchParams.set('custom_message', bookInfo.isCustomMessageEnabled.value && nftId.value ? '1' : '0')
    return url.toString()
  })

  return {
    nftClassId,
    nftId,
    filename,
    fileIndex,

    bookInfo,
    bookCoverSrc,

    bookFileURLWithCORS,
  }
}
