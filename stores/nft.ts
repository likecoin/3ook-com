export const useNFTStore = defineStore('nft', () => {
  const bookstoreStore = useBookstoreStore()

  const nftClassByIdMap = ref<Record<string, Partial<NFTClass>>>({})

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[normalizeNFTClassId(id)])
  const getNFTClassMetadataById = computed(() => (id: string) => {
    const nftClass = getNFTClassById.value(id)
    return nftClass?.metadata
  })

  function addNFTClass(nftClass: Partial<NFTClass>) {
    if (nftClass.address) {
      const nftClassId = normalizeNFTClassId(nftClass.address)
      nftClassByIdMap.value[nftClassId] = {
        ...nftClassByIdMap.value[nftClassId],
        ...nftClass,
        address: nftClassId,
      }
    }
  }

  function addNFTClassMetadata(nftClassId: string, nftClassMetadata: NFTClassMetadata) {
    const normalizedNFTClassId = normalizeNFTClassId(nftClassId)
    nftClassByIdMap.value[normalizedNFTClassId] = {
      ...(nftClassByIdMap.value[normalizedNFTClassId] || {}),
      metadata: nftClassMetadata,
    }
  }

  function addNFTClasses(nftClasses: NFTClass[]) {
    const nftClassIds: string[] = []
    for (const nftClass of nftClasses) {
      nftClassIds.push(normalizeNFTClassId(nftClass.address))
      addNFTClass(nftClass)
    }
    return nftClassIds
  }

  async function fetchNFTClassAggregatedMetadataById(nftClassId: string, options?: FetchLikeCoinNFTClassAggregatedMetadataOptions) {
    const data = await fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
    if (data.classData) {
      addNFTClassMetadata(nftClassId, data.classData as NFTClassMetadata)
    }
    if (data.bookstoreInfo !== undefined) {
      bookstoreStore.addBookstoreInfoByNFTClassId(nftClassId, data.bookstoreInfo)
    }
    return data
  }

  async function lazyFetchNFTClassAggregatedMetadataById(nftClassId: string, { exclude = [] }: FetchLikeCoinNFTClassAggregatedMetadataOptions = {}) {
    const excludedOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[] = exclude
    if (getNFTClassMetadataById.value(nftClassId)) {
      excludedOptions.push('class_chain')
    }
    if (bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)) {
      excludedOptions.push('bookstore')
    }
    return fetchNFTClassAggregatedMetadataById(nftClassId, { exclude: excludedOptions })
  }

  async function fetchNFTClassChainMetadataById(nftClassId: string) {
    const { metadata } = await fetchLikeCoinNFTClassChainMetadataById(nftClassId)
    if (metadata) addNFTClassMetadata(nftClassId, metadata)
    return metadata
  }

  async function lazyFetchNFTClassChainMetadataById(nftClassId: string) {
    if (getNFTClassMetadataById.value(nftClassId)) {
      return getNFTClassMetadataById.value(nftClassId)
    }
    return await fetchNFTClassChainMetadataById(nftClassId)
  }

  return {
    nftClassByIdMap,

    getNFTClassById,
    getNFTClassMetadataById,

    addNFTClass,
    addNFTClasses,
    addNFTClassMetadata,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
    fetchNFTClassChainMetadataById,
    lazyFetchNFTClassChainMetadataById,
  }
})
