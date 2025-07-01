export const useBookshelfStore = defineStore('bookshelf', () => {
  const nftStore = useNFTStore()
  const { user } = useUserSession()

  const nftByNFTClassIds = ref<Record<string, Record<string, NFT>>>({})
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const getNFTsByNFTClassId = computed(() => (nftClassId: string) => {
    return Object.values(nftByNFTClassIds.value[nftClassId] || {})
  })

  type Metadata = { '@type'?: string, 'type'?: string }
  const items = computed(() => {
    return Object.entries(nftByNFTClassIds.value)
      .filter(([nftClassId]) => {
        const metadata = nftStore.getNFTClassMetadataById(nftClassId)
        const type = metadata?.['@type'] || (metadata as Metadata)?.type
        return type === 'Book'
      })
      .map(([nftClassId, nfts]) => ({
        nftClassId,
        nftIds: Object.keys(nfts),
      }))
  })

  async function fetchItems({
    walletAddress = user.value?.evmWallet,
    isRefresh: shouldRefresh = false,
    limit = 100,
  } = {}) {
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

  watch(user, () => {
    hasFetched.value = false
    nftByNFTClassIds.value = {}
    nextKey.value = undefined
  })

  return {
    isFetching,
    hasFetched,
    nextKey,

    items,

    fetchItems,
    getNFTsByNFTClassId,
  }
})
