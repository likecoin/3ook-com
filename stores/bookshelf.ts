export const useBookshelfStore = defineStore('bookshelf', () => {
  const nftStore = useNFTStore()
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const accountStore = useAccountStore()

  const nftByNFTClassIds = ref<Record<string, Record<string, NFT>>>({})
  const legacyNFTClassIds = ref<string[]>([])
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const getNFTsByNFTClassId = computed(() => (nftClassId: string) => {
    return Object.values(nftByNFTClassIds.value[nftClassId] || {})
  })

  const items = computed(() => accountStore.isEVMMode
    ? Object.entries(nftByNFTClassIds.value)
        .filter(([nftClassId]) => nftStore.getNFTClassMetadataById(nftClassId)?.['@type'] === 'Book')
        .map(([nftClassId, nfts]) => ({
          nftClassId,
          nftIds: Object.keys(nfts),
        }))
    : legacyNFTClassIds.value.map(nftClassId => ({ nftClassId, nftIds: [] })),
  )

  async function fetchItems({ isRefresh: shouldRefresh = false } = {}) {
    const isRefresh = shouldRefresh || (!items.value.length && !hasFetched.value)
    if (!hasLoggedIn.value || isFetching.value || (!isRefresh && !nextKey.value)) {
      return
    }

    try {
      isFetching.value = true
      let res: FetchLikeCoinChainNFTsResponseData | FetchLegacyLikeCoinChainNFTClassesResponseData
      const key = isRefresh ? undefined : nextKey.value?.toString()
      if (accountStore.isEVMMode) {
        res = await fetchLikeCoinChainNFTs({
          nftOwner: user.value?.evmWallet,
          key,
          nocache: isRefresh,
        })
        res.data.forEach((item) => {
          const nftClassId = item.contract_address.toLowerCase() as `0x${string}`
          if (!nftByNFTClassIds.value[nftClassId]) {
            nftByNFTClassIds.value[nftClassId] = {}

            // NOTE: The aggregated metadata response does not include `owner_address`,
            // so we are manually including it here for now.
            nftStore.addNFTClass({
              address: nftClassId,
              name: item.name,
              owner_address: item.owner_address,
            })

            nftStore.lazyFetchNFTClassChainMetadataById(nftClassId)
          }
          const nftId = item.token_id
          nftByNFTClassIds.value[nftClassId][nftId] = item
        })
      }
      else {
        res = await fetchLegacyLikeCoinChainNFTClasses({
          nftOwner: user.value?.likeWallet,
          key,
        })
        const newNFTClassIds = nftStore.addLegacyNFTClasses(res.classes.filter((item) => {
          const nftMetaCollectionId = item.metadata?.nft_meta_collection_id
          return nftMetaCollectionId?.includes('nft_book') || nftMetaCollectionId?.includes('book_nft')
        }))
        if (isRefresh) {
          legacyNFTClassIds.value = newNFTClassIds
        }
        else {
          legacyNFTClassIds.value.push(...newNFTClassIds)
        }
      }
      nextKey.value = res.pagination.count < 100 ? undefined : res.pagination.next_key
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

  watch([user, () => accountStore.isEVMMode], () => {
    hasFetched.value = false
    nftByNFTClassIds.value = {}
    legacyNFTClassIds.value = []
    nextKey.value = undefined
  })

  return {
    legacyNFTClassIds,
    isFetching,
    hasFetched,
    nextKey,

    items,

    fetchItems,
    getNFTsByNFTClassId,
  }
})
