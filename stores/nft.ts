export const useNFTStore = defineStore('nft', () => {
  const iscnStore = useISCNStore()
  const bookstoreStore = useBookstoreStore()

  const nftClassByIdMap = ref<Record<string, NFTClass>>({})
  const nftClassOwnersNFTIdMapByNFTClassIdMap = ref<Record<string, Record<string, NFTIdList>>>({})

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[id])

  const getNFTClassFirstNFTIdByNFTClassIdAndOwnerWalletAddress = computed(() => (nftClassId: string, ownerWalletAddress: string) => {
    return nftClassOwnersNFTIdMapByNFTClassIdMap.value[nftClassId]?.[ownerWalletAddress]?.[0]
  })

  const getISCNIdPrefixByNFTClassId = computed(() => (nftClassId: string) => {
    const nftClass = getNFTClassById.value(nftClassId)
    return nftClass?.parent.iscn_id_prefix || undefined
  })

  const getISCNDataByNFTClassId = computed(() => (nftClassId: string) => {
    const iscnIdPrefix = getISCNIdPrefixByNFTClassId.value(nftClassId)
    if (!iscnIdPrefix) {
      return null
    }
    return iscnStore.getISCNRecordDataByIdPrefix(iscnIdPrefix)
  })

  function addNFTClass(nftClass: NFTClass) {
    nftClassByIdMap.value[nftClass.id] = nftClass
  }

  function addNFTClasses(nftClasses: NFTClass[]) {
    const nftClassIds: string[] = []
    for (const nftClass of nftClasses) {
      nftClassIds.push(nftClass.id)
      addNFTClass(nftClass)
    }
    return nftClassIds
  }

  async function fetchNFTClassOwnersById(nftClassId: string) {
    let nextKey: number | undefined
    do {
      const data = await fetchLikeCoinChainNFTClassOwnersById(nftClassId, { nextKey })
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
      addNFTClass(data.classData)
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
    nftClassOwnersNFTIdMapByNFTClassIdMap,

    getNFTClassById,
    getISCNIdPrefixByNFTClassId,
    getISCNDataByNFTClassId,
    getNFTClassFirstNFTIdByNFTClassIdAndOwnerWalletAddress,

    addNFTClass,
    addNFTClasses,
    fetchNFTClassOwnersById,
    lazyFetchNFTClassOwnersById,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
  }
})
