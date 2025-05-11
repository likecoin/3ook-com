export default function ({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const nftStore = useNFTStore()
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()

  const isEVM = computed(() => checkIsEVMAddress(nftClassId))

  const nftClass = computed(() => nftStore.getNFTClassById(nftClassId))
  const legacyNFTClass = computed(() => nftStore.getLegacyNFTClassById(nftClassId))

  const iscnIdPrefix = computed(() => legacyNFTClass.value?.parent.iscn_id_prefix)
  const iscnRecordData = computed(() => nftStore.getISCNDataByNFTClassId(nftClassId))

  const publisherWalletAddress = computed(() => isEVM.value ? nftClass.value?.owner_address : legacyNFTClass.value?.owner)
  const publisherName = computed(() => {
    return metadataStore.getLikerInfoByWalletAddress(publisherWalletAddress.value)?.displayName
  })

  const legacyContentMetadata = computed(() => iscnRecordData.value?.contentMetadata)
  const contentMetadata = computed(() => nftClass.value?.metadata)

  const name = computed(() => isEVM.value ? contentMetadata.value?.name : legacyContentMetadata.value?.name)
  const description = computed(() => isEVM.value ? contentMetadata.value?.description : legacyContentMetadata.value?.description)

  const author = computed(() => isEVM.value ? contentMetadata.value?.author : legacyContentMetadata.value?.author)
  const authorName = computed(() => {
    return (typeof author.value === 'string' ? author.value : author.value?.name) || publisherName.value
  })

  const coverSrc = computed(() => normalizeURIToHTTP(isEVM.value ? contentMetadata.value?.thumbnailUrl : legacyNFTClass.value?.metadata.image))

  const publishedDate = computed(() => {
    const datePublished = isEVM.value ? contentMetadata.value?.datePublished : legacyContentMetadata.value?.datePublished
    return datePublished ? new Date(datePublished) : undefined
  })

  const releasedDate = computed(() => {
    if (publishedDate.value) return publishedDate.value
    return new Date((isEVM.value ? contentMetadata.value?.recordTimestamp : legacyNFTClass.value?.created_at) || Date.now())
  })

  const externalURL = computed(() => isEVM.value ? contentMetadata.value?.external_url : legacyContentMetadata.value?.url || legacyContentMetadata.value?.external_url)

  const contentFingerprints = computed(() => {
    return (isEVM.value ? contentMetadata.value?.contentFingerprints : iscnRecordData.value?.contentFingerprints) || []
  })

  const nftClassContentURLs = computed(() => (isEVM.value ? contentMetadata.value?.sameAs : legacyContentMetadata.value?.sameAs) || [])

  const nftClassReadActionEntryPoints = computed(() => {
    const { potentialAction } = (isEVM.value ? contentMetadata.value : legacyContentMetadata.value) || {}
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
    if (nftClassReadActionEntryPoints.value.length) {
      return nftClassReadActionEntryPoints.value
    }
    return nftClassContentURLs.value.map(url => ({
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

    iscnIdPrefix,
    nftClass,
    legacyNFTClass,

    name,
    description,
    coverSrc,
    authorName,

    publisherName,
    publisherWalletAddress,

    publishedDate,
    releasedDate,

    externalURL,
    contentFingerprints,
    contentURLs,
    contentTypes,

    bookstoreInfo,
    isCustomMessageEnabled,
  }
}
