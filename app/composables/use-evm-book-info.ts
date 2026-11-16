export function useEVMBookInfo(
  { nftClassId }: { nftClassId: string | Ref<string> | ComputedRef<string> },
) {
  const queryCache = useQueryCache()
  const { normalizeURIToHTTP } = useURIParser()

  const nftClass = computed(() => getNFTClassByIdFromCache(queryCache, toValue(nftClassId)))

  const nftClassOwnerWalletAddress = computed(() => nftClass.value?.owner_address || '')

  const contentMetadata = computed(() => nftClass.value?.metadata)

  // The listing holds staff corrections not yet signed to chain, so it wins;
  // an empty string there means unset, not a deliberate blank.
  const bookstoreInfo = computed(() => getBookstoreInfoByNFTClassIdFromCache(queryCache, toValue(nftClassId)))

  const name = computed(() => bookstoreInfo.value?.name || contentMetadata.value?.name || '')
  const alternativeHeadline = computed(() => (
    bookstoreInfo.value?.alternativeHeadline || contentMetadata.value?.alternativeHeadline
  ))
  const description = computed(() => contentMetadata.value?.description || '')

  const author = computed(() => contentMetadata.value?.author)
  const publisher = computed(() => contentMetadata.value?.publisher)

  const coverSrc = computed(() => normalizeURIToHTTP(contentMetadata.value?.thumbnailUrl || contentMetadata.value?.image))

  const isbn = computed(() => bookstoreInfo.value?.isbn || contentMetadata.value?.isbn)
  const inLanguage = computed(() => contentMetadata.value?.inLanguage)

  const publishedDate = computed(() => {
    const datePublished = bookstoreInfo.value?.datePublished || contentMetadata.value?.datePublished
    if (!datePublished) return undefined
    const date = new Date(datePublished)
    return Number.isNaN(date.getTime()) ? undefined : date
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
    alternativeHeadline,
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
