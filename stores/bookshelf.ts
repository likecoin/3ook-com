export const useBookshelfStore = defineStore('bookshelf', () => {
  const nftStore = useNFTStore()
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const accountStore = useAccountStore()

  const nftByNFTClassIds = ref<Record<string, Record<string, NFT>>>({})
  const nftClassIds = ref<string[]>([])
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const items = computed(() => nftClassIds.value.map(nftClassId => ({ id: nftClassId, nftClassId })))

  async function fetchItems({ isRefresh: shouldRefresh = false } = {}) {
    const isRefresh = shouldRefresh || (!nftClassIds.value.length && !hasFetched.value)
    if (!hasLoggedIn.value || isFetching.value || (!isRefresh && !nextKey.value)) {
      return
    }

    try {
      isFetching.value = true
      let newNFTClassIds: string[] = []
      let res: FetchLikeCoinChainNFTsResponseData | FetchLegacyLikeCoinChainNFTClassesResponseData
      const key = isRefresh ? undefined : nextKey.value?.toString()
      if (accountStore.isEVMMode) {
        const existedNFTClassIdsSet = new Set<string>(isRefresh ? [] : nftClassIds.value)
        res = await fetchLikeCoinChainNFTs({
          nftOwner: user.value?.evmWallet,
          key,
        })
        res.data.forEach((item) => {
          const nftClassId = item.contract_address as `0x${string}`
          if (!nftByNFTClassIds.value[nftClassId]) {
            nftByNFTClassIds.value[nftClassId] = {}

            // NOTE: The aggregated metadata response does not include `owner_address`,
            // so we are manually including it here for now.
            nftStore.addNFTClass({
              address: nftClassId,
              name: item.name,
              owner_address: item.owner_address,
            })
          }
          if (!existedNFTClassIdsSet.has(nftClassId)) {
            existedNFTClassIdsSet.add(nftClassId)
            newNFTClassIds.push(nftClassId)
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
        newNFTClassIds = nftStore.addLegacyNFTClasses(res.classes.filter((item) => {
          const nftMetaCollectionId = item.metadata?.nft_meta_collection_id
          return nftMetaCollectionId?.includes('nft_book') || nftMetaCollectionId?.includes('book_nft')
        }))
      }
      nextKey.value = res.pagination.count < 100 ? undefined : res.pagination.next_key
      if (isRefresh) {
        nftClassIds.value = newNFTClassIds
      }
      else {
        nftClassIds.value.push(...newNFTClassIds)
      }
    }
    finally {
      isFetching.value = false
      hasFetched.value = true
    }
  }

  watch([user, () => accountStore.isEVMMode], () => {
    hasFetched.value = false
    nftClassIds.value = []
    nextKey.value = undefined
  })

  return {
    nftClassIds,
    isFetching,
    hasFetched,
    nextKey,

    items,

    fetchItems,
  }
})
