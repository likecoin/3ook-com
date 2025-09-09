export const useNFTStore = defineStore('nft', () => {
  const bookstoreStore = useBookstoreStore()

  const nftClassByIdMap = ref<Record<string, Partial<NFTClass>>>({})
  const nftClassOwnersNFTIdMapByNFTClassIdMap = ref<Record<string, Record<string, NFTIdList>>>({})

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[id])
  const getNFTClassMetadataById = computed(() => (id: string) => {
    const nftClass = getNFTClassById.value(id)
    return nftClass?.metadata
  })
  const getNFTIdsByNFTClassIdAndOwnerWalletAddress = computed(() => (nftClassId: string, ownerWalletAddress: string) => {
    return nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]?.[ownerWalletAddress] || []
  })

  function addNFTClass(nftClass: Partial<NFTClass>) {
    if (nftClass.address) {
      nftClassByIdMap.value[nftClass.address] = { ...nftClassByIdMap.value[nftClass.address], ...nftClass }
    }
  }

  function addNFTClassMetadata(nftClassId: string, nftClassMetadata: NFTClassMetadata) {
    nftClassByIdMap.value[nftClassId] = {
      ...(nftClassByIdMap.value[nftClassId] || {}),
      metadata: nftClassMetadata,
    }
  }

  function addNFTClasses(nftClasses: NFTClass[]) {
    const nftClassIds: string[] = []
    for (const nftClass of nftClasses) {
      nftClassIds.push(nftClass.address)
      addNFTClass(nftClass)
    }
    return nftClassIds
  }

  async function fetchNFTClassAggregatedMetadataById(nftClassId: string, options?: FetchLikeCoinNFTClassAggregatedMetadataOptions) {
    const data = await fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
    if (data.classData) {
      addNFTClassMetadata(nftClassId, data.classData as NFTClassMetadata)
    }
    if (data.ownerInfo) {
      nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId] = data.ownerInfo
    }
    if (data.bookstoreInfo !== undefined) {
      bookstoreStore.addBookstoreInfoByNFTClassId(nftClassId, data.bookstoreInfo)
    }
  }

  async function lazyFetchNFTClassAggregatedMetadataById(nftClassId: string, { exclude = [] }: FetchLikeCoinNFTClassAggregatedMetadataOptions = {}) {
    const excludedOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[] = exclude
    if (getNFTClassMetadataById.value(nftClassId)) {
      excludedOptions.push('class_chain')
    }
    if (nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]) {
      excludedOptions.push('owner')
    }
    if (bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)) {
      excludedOptions.push('bookstore')
    }
    return fetchNFTClassAggregatedMetadataById(nftClassId, { exclude: excludedOptions })
  }

  async function fetchNFTClassChainMetadataById(nftClassId: string) {
    const { metadata } = await fetchLikeCoinNFTClassChainMetadataById(nftClassId)
    addNFTClassMetadata(nftClassId, metadata)
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
    nftClassOwnersNFTIdMapByNFTClassIdMap,

    getNFTClassById,
    getNFTClassMetadataById,
    getNFTIdsByNFTClassIdAndOwnerWalletAddress,

    addNFTClass,
    addNFTClasses,
    addNFTClassMetadata,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
    fetchNFTClassChainMetadataById,
    lazyFetchNFTClassChainMetadataById,
  }
})
