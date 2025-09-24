export const useBookshelfStore = defineStore('bookshelf', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const nftStore = useNFTStore()
  const likeNFTClassContract = useLikeNFTClassContract()

  const nftByNFTClassIds = ref<Record<string, Record<string, NFT>>>({})
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const getNFTsByNFTClassId = computed(() => (nftClassId: string) => {
    return Object.values(nftByNFTClassIds.value[nftClassId] || {})
  })

  const getFirstNFTByNFTClassId = computed(() => (nftClassId: string) => {
    const nfts = getNFTsByNFTClassId.value(nftClassId)
    return nfts[0]
  })

  const items = computed(() => {
    return Object.entries(nftByNFTClassIds.value)
      .filter(([nftClassId]) => nftStore.getNFTClassMetadataById(nftClassId)?.['@type'] === 'Book')
      .map(([nftClassId, nfts]) => ({
        nftClassId,
        nftIds: Object.keys(nfts),
      }))
  })

  async function fetchItems({
    walletAddress,
    isRefresh: shouldRefresh = false,
    limit = 100,
  }: {
    walletAddress: string
    isRefresh?: boolean
    limit?: number
  }) {
    const isRefresh = shouldRefresh || (!items.value.length && !hasFetched.value)
    if (!walletAddress || isFetching.value || (!isRefresh && !nextKey.value)) {
      return
    }

    try {
      isFetching.value = true
      const key = isRefresh ? undefined : nextKey.value?.toString()
      const res = await fetchNFTsByOwnerWalletAddress(walletAddress, {
        key,
        nocache: isRefresh,
        limit,
      })
      res.data.forEach((item) => {
        const nftClassId = item.contract_address.toLowerCase() as `0x${string}`
        if (!nftByNFTClassIds.value[nftClassId]) {
          nftByNFTClassIds.value[nftClassId] = {}

          nftStore.lazyFetchNFTClassChainMetadataById(nftClassId)
        }
        const nftId = item.token_id
        nftByNFTClassIds.value[nftClassId][nftId] = item
      })
      nextKey.value = res.pagination.count < limit ? undefined : res.pagination.next_key
    }
    catch (error) {
      const statusCode = getErrorStatusCode(error)
      if (statusCode === 404) {
        // NOTE: For a new wallet address, the API will return 404
        return
      }
      throw error
    }
    finally {
      isFetching.value = false
      hasFetched.value = true
    }
  }

  async function fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(nftClassId: string, ownerWalletAddress: string) {
    const nftClassMetadataPromise = likeNFTClassContract.fetchNFTClassMetadataById(nftClassId)
    const nftBalance = await likeNFTClassContract.fetchNFTBalanceOf(nftClassId, ownerWalletAddress)
    if (!nftBalance) return
    const nftId = await likeNFTClassContract.fetchNFTIdByNFTClassIdAndWalletAddressAndIndex(nftClassId, ownerWalletAddress, 0)
    const [nftClassMetadata, nftMetadata] = await Promise.all([
      nftClassMetadataPromise,
      likeNFTClassContract.fetchNFTMetadataByNFTClassIdAndNFTId(nftClassId, nftId),
    ])
    if (nftClassMetadata) {
      nftStore.addNFTClassMetadata(nftClassId, nftClassMetadata)
    }
    if (nftId && nftMetadata) {
      if (!nftByNFTClassIds.value[nftClassId]) {
        nftByNFTClassIds.value[nftClassId] = {}
      }
      // NOTE: Mimic the structure of the NFT metadata from indexer
      nftMetadata.token_id = nftId
      nftByNFTClassIds.value[nftClassId][nftId] = nftMetadata
    }
  }

  function reset() {
    isFetching.value = false
    hasFetched.value = false
    nftByNFTClassIds.value = {}
    nextKey.value = undefined
  }

  watch(hasLoggedIn, (value, oldValue) => {
    // NOTE: Reset the store when user logs out
    if (oldValue && !value) {
      reset()
    }
  })

  return {
    isFetching,
    hasFetched,
    nextKey,

    items,

    fetchItems,
    getNFTsByNFTClassId,
    getFirstNFTByNFTClassId,
    fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract,
    reset,
  }
})
