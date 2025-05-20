export function useEVMBookInfo({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const nftStore = useNFTStore()

  const nftClass = computed(() => nftStore.getNFTClassById(nftClassId))

  const publisherWalletAddress = computed(() => nftClass.value?.owner_address)

  const contentMetadata = computed(() => nftClass.value?.metadata)

  const name = computed(() => contentMetadata.value?.name)
  const description = computed(() => contentMetadata.value?.description)

  const author = computed(() => contentMetadata.value?.author)

  const coverSrc = computed(() => normalizeURIToHTTP(contentMetadata.value?.thumbnailUrl))

  const publishedDate = computed(() => {
    const datePublished = contentMetadata.value?.datePublished
    return datePublished ? new Date(datePublished) : undefined
  })

  const releasedDate = computed(() => {
    if (publishedDate.value) return publishedDate.value
    return new Date(contentMetadata.value?.recordTimestamp || Date.now())
  })

  const externalURL = computed(() => contentMetadata.value?.external_link)

  const contentFingerprints = computed(() => contentMetadata.value?.contentFingerprints || [])

  const sameAs = computed(() => contentMetadata.value?.sameAs || [])

  const potentialAction = computed(() => contentMetadata.value?.potentialAction)

  return {
    name,
    description,
    coverSrc,
    author,

    publisherWalletAddress,

    publishedDate,
    releasedDate,

    externalURL,
    contentFingerprints,
    sameAs,
    potentialAction,
  }
}
