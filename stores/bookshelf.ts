export const useBookshelfStore = defineStore('bookshelf', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const nftStore = useNFTStore()
  const likeNFTClassContract = useLikeNFTClassContract()

  const nftClassIds = ref<Set<string>>(new Set())
  const tokenIdsByNFTClassId = ref<Record<string, string[]>>({})
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)

  const getTokenIdsByNFTClassId = computed(() => (nftClassId: string) => {
    const normalizedId = nftClassId.toLowerCase()
    return tokenIdsByNFTClassId.value[normalizedId] || []
  })

  const getFirstTokenIdByNFTClassId = computed(() => (nftClassId: string) => {
    return getTokenIdsByNFTClassId.value(nftClassId)[0]
  })

  const items = computed(() => {
    return Array.from(nftClassIds.value)
      .filter((nftClassId) => {
        const metadata = nftStore.getNFTClassMetadataById(nftClassId)
        return metadata?.['@type'] === 'Book'
      })
      .map(nftClassId => ({
        nftClassId,
        nftIds: tokenIdsByNFTClassId.value[nftClassId] || [],
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
      const res = await fetchTokenBookNFTsByAccount(walletAddress, {
        key,
        nocache: isRefresh,
        limit,
      })

      res.data.forEach((nftClass) => {
        const nftClassId = nftClass.address.toLowerCase() as `0x${string}`

        nftClassIds.value.add(nftClassId)
        tokenIdsByNFTClassId.value[nftClassId] ??= []

        if (nftClass.metadata) {
          nftStore.addNFTClassMetadata(nftClassId, nftClass.metadata)
        }
      })

      nextKey.value = res.pagination.count < limit ? undefined : res.pagination.next_key
    }
    catch (error) {
      const statusCode = getErrorStatusCode(error)
      if (statusCode === 404) {
        // NOTE: For a new wallet address, the API will return 404
        return
      }
      throw createError({
        statusCode,
        statusMessage: getErrorMessage(error),
        fatal: true,
      })
    }
    finally {
      isFetching.value = false
      hasFetched.value = true
    }
  }

  async function fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(
    nftClassId: string,
    ownerWalletAddress: string,
    { isRefresh = false }: { isRefresh?: boolean } = {},
  ) {
    const normalizedNFTClassId = nftClassId.toLowerCase()

    const hasNFTClass = nftClassIds.value.has(normalizedNFTClassId)
    const existingTokenIds = tokenIdsByNFTClassId.value[normalizedNFTClassId]
    const existingMetadata = nftStore.getNFTClassMetadataById(normalizedNFTClassId)

    if (!isRefresh && hasNFTClass && existingTokenIds?.length && existingMetadata) {
      return
    }

    const nftBalance = await likeNFTClassContract.fetchNFTBalanceOf(nftClassId, ownerWalletAddress)
    if (!nftBalance) return

    const tokenId = await likeNFTClassContract.fetchNFTIdByNFTClassIdAndWalletAddressAndIndex(nftClassId, ownerWalletAddress, 0)

    let nftClassMetadata = existingMetadata
    if (!nftClassMetadata || isRefresh) {
      nftClassMetadata = await likeNFTClassContract.fetchNFTClassMetadataById(nftClassId)
      if (nftClassMetadata) {
        nftStore.addNFTClassMetadata(normalizedNFTClassId, nftClassMetadata)
      }
    }

    if (nftClassMetadata) {
      nftClassIds.value.add(normalizedNFTClassId)

      if (tokenId) {
        tokenIdsByNFTClassId.value[normalizedNFTClassId] = [tokenId]
      }
    }
  }

  function reset() {
    isFetching.value = false
    hasFetched.value = false
    nftClassIds.value.clear()
    tokenIdsByNFTClassId.value = {}
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
    getTokenIdsByNFTClassId,
    getFirstTokenIdByNFTClassId,
    fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract,
    reset,
  }
})
