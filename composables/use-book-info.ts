export default function ({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()
  const evmBookInfo = useEVMBookInfo({ nftClassId })
  const legacyBookInfo = useLegacyBookInfo({ nftClassId })
  const isEVM = computed(() => checkIsEVMAddress(nftClassId))

  const bookInfo = isEVM.value ? evmBookInfo : legacyBookInfo

  const authorName = computed(() => {
    const author = bookInfo.author.value
    if (typeof author === 'string') return author
    if (typeof author === 'object' && 'name' in author) return author.name
    return ''
  })

  const publisherName = computed(() => metadataStore.getLikerInfoByWalletAddress(bookInfo.publisherWalletAddress.value)?.displayName || '')

  const readActionEntryPoints = computed(() => {
    const potentialAction = bookInfo.potentialAction.value
    let readAction: ReadAction | undefined
    if (potentialAction && potentialAction['@type'] === 'ReadAction') {
      readAction = potentialAction as ReadAction
    }
    let entryPoints: ReadActionEntryPoint[] = []
    if (readAction) {
      entryPoints = readAction.target || []
    }
    return entryPoints.map((entryPoint) => {
      const { contentType, url, name } = entryPoint
      return {
        url: normalizeURIToHTTP(url),
        name,
        type: extractContentTypeFromURL(contentType),
      }
    })
  })

  const contentURLs = computed(() => {
    if (readActionEntryPoints.value.length) {
      return readActionEntryPoints.value
    }
    return bookInfo.sameAs.value.map(url => ({
      url: normalizeURIToHTTP(url),
      name: extractFilenameFromContentURL(url),
      type: extractContentTypeFromURL(url),
    }))
  })

  const contentTypes = computed(() => {
    const types = contentURLs.value.map(({ type }) => type)
    return [...new Set(types.filter(type => type !== 'unknown'))]
  })

  const bookstoreInfo = computed(() => {
    return bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)
  })

  const isCustomMessageEnabled = computed(() => {
    return bookstoreInfo.value?.enableCustomMessagePage || false
  })

  return {
    isEVM,

    ...bookInfo,

    authorName,
    publisherName,

    contentURLs,
    contentTypes,

    bookstoreInfo,
    isCustomMessageEnabled,
  }
}
