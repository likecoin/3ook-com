export default function () {
  const config = useRuntimeConfig()
  const { user } = useUserSession()
  const nftStore = useNFTStore()
  const bookshelfStore = useBookshelfStore()

  const nftClassId = computed(() => getRouteQuery('nft_class_id'))
  const bookInfo = useBookInfo({ nftClassId: nftClassId.value })

  const ownerFirstNFTId = computed(() => {
    // Find the first NFT Id from bookshelf
    let nftId = bookshelfStore.getNFTsByNFTClassId(nftClassId.value).map(nft => nft.token_id)[0]
    if (!nftId) {
      // Find the first NFT Id owned by the user for the given NFT class
      const ownerWallet = bookInfo.isEVM.value ? user.value?.evmWallet : user.value?.likeWallet
      nftId = nftStore.getNFTIdsByNFTClassIdAndOwnerWalletAddress(nftClassId.value, ownerWallet || '')[0]
    }
    return nftId
  })

  const nftId = computed(() => getRouteQuery('nft_id') || ownerFirstNFTId.value)
  const filename = computed(() => getRouteQuery('filename'))
  const fileIndex = computed(() => getRouteQuery('index', '0'))

  const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

  const bookFileURLWithCORS = computed(() => {
    const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
    url.searchParams.set('class_id', nftClassId.value)
    if (nftId.value !== undefined) {
      url.searchParams.set('nft_id', nftId.value)
    }
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
