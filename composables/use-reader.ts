export default function (
  {
    nftClassIdInput,
  }: {
    nftClassIdInput?: Ref<string> | string

  } = {},
) {
  const config = useRuntimeConfig()

  const nftClassId = computed(() => {
    const queryValue = getRouteQuery('nft_class_id')
    if (queryValue !== undefined && queryValue !== '') {
      return queryValue
    }
    else if (nftClassIdInput) {
      return isRef(nftClassIdInput) ? nftClassIdInput.value : nftClassIdInput
    }
    else {
      return ''
    }
  })

  const bookInfo = useBookInfo({ nftClassId: nftClassId.value })

  const nftId = computed(() => {
    const id = getRouteQuery('nft_id')
    return id !== undefined && id !== '' ? id : bookInfo.userOwnedNFTIds.value[0]
  })
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
    fileIndex,

    bookInfo,
    bookCoverSrc,

    bookFileURLWithCORS,
  }
}
