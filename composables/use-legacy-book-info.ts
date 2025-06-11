export default function ({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const nftStore = useNFTStore()

  const nftClass = computed(() => nftStore.getLegacyNFTClassById(nftClassId))

  const iscnRecordData = computed(() => nftStore.getISCNDataByNFTClassId(nftClassId))

  const nftClassOwnerWalletAddress = computed(() => nftClass.value?.owner)

  const contentMetadata = computed(() => iscnRecordData.value?.contentMetadata)

  const name = computed(() => contentMetadata.value?.name)
  const description = computed(() => contentMetadata.value?.description)

  const author = computed(() => contentMetadata.value?.author)
  const publisher = computed(() => contentMetadata.value?.publisher)

  const isbn = computed(() => contentMetadata.value?.isbn)
  const inLanguage = computed(() => contentMetadata.value?.inLanguage)

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

  const contentFingerprints = computed(() => iscnRecordData.value?.contentFingerprints || [])

  const sameAs = computed(() => contentMetadata.value?.sameAs || [])

  const potentialAction = computed(() => contentMetadata.value?.potentialAction)

  return {
    name,
    description,
    coverSrc,
    nftClassOwnerWalletAddress,
    author,
    publisher,

    isbn,
    inLanguage,

    publishedDate,
    releasedDate,

    externalURL,
    contentFingerprints,
    sameAs,
    potentialAction,
  }
}
