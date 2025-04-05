export default function ({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const nftStore = useNFTStore()
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()

  const nftClass = computed(() => nftStore.getNFTClassById(nftClassId))
  const iscnIdPrefix = computed(() => nftClass.value?.parent.iscn_id_prefix)
  const iscnRecordData = computed(() => nftStore.getISCNDataByNFTClassId(nftClassId))

  const publisherWalletAddress = computed(() => nftClass.value?.owner)
  const publisherName = computed(() => {
    return metadataStore.getLikerInfoByWalletAddress(publisherWalletAddress.value)?.displayName
  })

  const contentMetadata = computed(() => iscnRecordData.value?.contentMetadata)

  const name = computed(() => contentMetadata.value?.name)
  const description = computed(() => contentMetadata.value?.description)

  const author = computed(() => contentMetadata.value?.author)
  const authorName = computed(() => {
    return (typeof author.value === 'string' ? author.value : author.value?.name) || publisherName.value
  })

  const coverSrc = computed(() => normalizeURIToHTTP(nftClass.value?.metadata.image))

  const publishedDate = computed(() => {
    const datePublished = contentMetadata.value?.datePublished
    return datePublished ? new Date(datePublished) : undefined
  })

  const releasedDate = computed(() => {
    if (publishedDate.value) return publishedDate.value
    return new Date(nftClass.value?.created_at || Date.now())
  })

  const externalURL = computed(() => contentMetadata.value?.url || contentMetadata.value?.external_url)

  const contentFingerprints = computed(() => {
    return iscnRecordData.value?.contentFingerprints || []
  })

  const nftClassContentURLs = computed(() => contentMetadata.value?.sameAs || [])

  const nftClassReadActionTargets = computed(() => {
    const { potentialAction } = contentMetadata.value || {}
    if (!potentialAction) return []
    let targets: ReadActionTarget[] = []
    if (Array.isArray(potentialAction)) {
      const readAction = potentialAction.find(
        action => action.name === 'ReadAction',
      )
      if (!readAction) return [];
      ({ targets } = readAction)
    }
    else {
      const readAction = potentialAction.ReadAction
      if (!readAction) return [];
      ({ targets } = readAction)
    }
    return targets.map((target) => {
      const { contentType, url, name } = target
      return {
        url: normalizeURIToHTTP(url),
        name,
        type: extractContentTypeFromURL(contentType),
      }
    })
  })

  const contentURLs = computed(() => {
    if (nftClassReadActionTargets.value.length) {
      return nftClassReadActionTargets.value
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
    iscnIdPrefix,
    nftClass,

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
