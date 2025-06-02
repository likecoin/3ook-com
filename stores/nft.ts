export const useNFTStore = defineStore('nft', () => {
  const iscnStore = useISCNStore()
  const bookstoreStore = useBookstoreStore()

  const legacyNFTClassByIdMap = ref<Record<string, LegacyNFTClass>>({})
  const nftClassByIdMap = ref<Record<string, Partial<NFTClass>>>({})
  const nftClassOwnersNFTIdMapByNFTClassIdMap = ref<Record<string, Record<string, NFTIdList>>>({})

  const getLegacyNFTClassById = computed(() => (id: string) => legacyNFTClassByIdMap.value[id])

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[id])

  const getNFTIdsByNFTClassIdAndOwnerWalletAddress = computed(() => (nftClassId: string, ownerWalletAddress: string) => {
    return nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]?.[ownerWalletAddress] || []
  })

  const getISCNIdPrefixByNFTClassId = computed(() => (nftClassId: string) => {
    if (checkIsEVMAddress(nftClassId)) {
      return undefined
    }
    const nftClass = getLegacyNFTClassById.value(nftClassId)
    return nftClass?.parent.iscn_id_prefix || undefined
  })

  const getISCNDataByNFTClassId = computed(() => (nftClassId: string) => {
    const iscnIdPrefix = getISCNIdPrefixByNFTClassId.value(nftClassId)
    if (!iscnIdPrefix) {
      return null
    }
    return iscnStore.getISCNRecordDataByIdPrefix(iscnIdPrefix)
  })

  function addLegacyNFTClass(nftClass: LegacyNFTClass) {
    legacyNFTClassByIdMap.value[nftClass.id] = nftClass
  }

  function addLegacyNFTClasses(nftClasses: LegacyNFTClass[]) {
    const nftClassIds: string[] = []
    for (const nftClass of nftClasses) {
      nftClassIds.push(nftClass.id)
      addLegacyNFTClass(nftClass)
    }
    return nftClassIds
  }

  function addNFTClass(nftClass: Partial<NFTClass>) {
    if (nftClass.address) {
      nftClassByIdMap.value[nftClass.address] = { ...nftClassByIdMap.value[nftClass.address], ...nftClass }
    }
  }

  function addNFTClassMetadata(nftClassId: string, nftClassMetadata: NFTClassMetadata) {
    nftClassByIdMap.value[nftClassId] = {
      ...nftClassByIdMap.value[nftClassId],
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

  async function fetchNFTClassOwnersById(nftClassId: string) {
    let nextKey: number | undefined
    do {
      const data = await fetchLegacyLikeCoinChainNFTClassOwnersById(nftClassId, { nextKey })
      nextKey = data.pagination.next_key
      if (!nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]) {
        nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId] = {}
      }
      data.owners.forEach(({ owner, nfts }) => {
        nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId][owner] = nfts
      })
    } while (nextKey)
    return nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]
  }

  async function lazyFetchNFTClassOwnersById(nftClassId: string) {
    if (nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]) {
      return nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]
    }
    return await fetchNFTClassOwnersById(nftClassId)
  }

  async function fetchNFTClassAggregatedMetadataById(nftClassId: string, options?: FetchLikeCoinNFTClassAggregatedMetadataOptions) {
    const data = await fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
    if (data.classData) {
      if (checkIsEVMAddress(nftClassId)) {
        addNFTClassMetadata(nftClassId, data.classData as NFTClassMetadata)
      }
      else {
        addLegacyNFTClass(data.classData as LegacyNFTClass)
      }
    }
    if (data.ownerInfo) {
      nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId] = data.ownerInfo
    }
    if (data.iscnData) {
      iscnStore.addISCNRecordData(data.iscnData)
    }
    if (data.bookstoreInfo) {
      bookstoreStore.addBookstoreInfoByNFTClassId(nftClassId, data.bookstoreInfo)
    }
  }

  async function lazyFetchNFTClassAggregatedMetadataById(nftClassId: string, { exclude = [] }: FetchLikeCoinNFTClassAggregatedMetadataOptions = {}) {
    const excludedOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[] = exclude
    if (nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]) {
      excludedOptions.push('owner')
    }
    if (iscnStore.getISCNRecordDataByIdPrefix(nftClassId)) {
      excludedOptions.push('iscn')
    }
    if (bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)) {
      excludedOptions.push('bookstore')
    }
    return fetchNFTClassAggregatedMetadataById(nftClassId, { exclude: excludedOptions })
  }

  return {
    nftClassByIdMap,
    legacyNFTClassByIdMap,
    nftClassOwnersNFTIdMapByNFTClassIdMap,

    getNFTClassById,
    getLegacyNFTClassById,
    getISCNIdPrefixByNFTClassId,
    getISCNDataByNFTClassId,
    getNFTIdsByNFTClassIdAndOwnerWalletAddress,

    addNFTClass,
    addNFTClasses,
    addNFTClassMetadata,
    addLegacyNFTClass,
    addLegacyNFTClasses,
    fetchNFTClassOwnersById,
    lazyFetchNFTClassOwnersById,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
  }
})
