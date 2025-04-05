export const useBookshelfStore = defineStore('bookshelf', () => {
  const nftStore = useNFTStore()
  const { loggedIn: hasLoggedIn, user } = useUserSession()

  const nftClassIds = ref<string[]>([])
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const items = computed(() => nftClassIds.value.map(nftClassId => ({ id: nftClassId, nftClassId })))

  async function fetchItems({ isMore = false } = {}) {
    if (!hasLoggedIn.value || isFetching.value || (isMore && !nextKey.value)) {
      return
    }

    try {
      isFetching.value = true
      const res = await fetchLikeCoinChainNFTClasses({
        nftOwner: user.value?.likeWallet,
        expand: false,
        reverse: true,
        limit: 100,
        key: isMore ? nextKey.value?.toString() : undefined,
      })
      const ids = nftStore.addNFTClasses(res.classes.filter((item) => {
        const nftMetaCollectionId = item.metadata.nft_meta_collection_id
        return nftMetaCollectionId?.includes('nft_book') || nftMetaCollectionId?.includes('book_nft')
      }))
      if (isMore) {
        nftClassIds.value.push(...ids)
      }
      else {
        nftClassIds.value = ids
      }
      nextKey.value = res.pagination.count < 100 ? undefined : res.pagination.next_key
    }
    finally {
      isFetching.value = false
      hasFetched.value = true
    }
  }

  return {
    nftClassIds,
    isFetching,
    hasFetched,
    nextKey,

    items,

    fetchItems,
  }
})
