export interface BookshelfItem {
  nftClassId: string
  nftIds: string[]
  lastOpenedTime: number
  progress: number
  archivedAt?: number | null
}

export const useBookshelfStore = defineStore('bookshelf', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const nftStore = useNFTStore()
  const likeNFTClassContract = useLikeNFTClassContract()
  const bookSettingsStore = useBookSettingsStore()

  const nftClassIds = ref<string[]>([])
  const tokenIdsByNFTClassId = ref<Record<string, string[]>>({})
  const persistedWalletAddress = ref<string | null>(null)
  const isFetching = ref(false)
  const hasFetched = ref(false)
  const nextKey = ref<number | undefined>(undefined)
  const lastError = ref<{ statusCode: number, statusMessage: string } | null>(null)
  // Bumped on reset() so in-flight fetches can detect they've been superseded
  // (e.g. by a wallet switch) and skip repopulating just-cleared state.
  let resetGeneration = 0

  const getTokenIdsByNFTClassId = computed(() => (nftClassId: string) => {
    const normalizedId = nftClassId.toLowerCase()
    return tokenIdsByNFTClassId.value[normalizedId] || []
  })

  const getFirstTokenIdByNFTClassId = computed(() => (nftClassId: string) => {
    return getTokenIdsByNFTClassId.value(nftClassId)[0]
  })

  const items = computed<BookshelfItem[]>(() => {
    return nftClassIds.value
      .filter((nftClassId) => {
        const metadata = nftStore.getNFTClassMetadataById(nftClassId)
        return metadata?.['@type'] === 'Book'
      })
      .map((nftClassId) => {
        const nftIds = tokenIdsByNFTClassId.value[nftClassId] || []
        const settings = bookSettingsStore.getSettings(nftClassId)
        const progressData = {
          lastOpenedTime: settings?.lastOpenedTime || 0,
          progress: settings?.progress || 0,
        }

        return {
          nftClassId,
          nftIds,
          lastOpenedTime: progressData.lastOpenedTime,
          progress: progressData.progress,
          archivedAt: settings?.archivedAt,
        }
      })
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
    const normalizedWalletAddress = walletAddress?.toLowerCase()
    if (
      normalizedWalletAddress
      && persistedWalletAddress.value
      && persistedWalletAddress.value !== normalizedWalletAddress
    ) {
      reset()
    }

    const isRefresh = shouldRefresh || !hasFetched.value
    if (!walletAddress || isFetching.value || (!isRefresh && !nextKey.value)) {
      return
    }

    const generation = resetGeneration
    const isStale = () => generation !== resetGeneration

    try {
      isFetching.value = true
      const key = isRefresh ? undefined : nextKey.value?.toString()
      const res = await fetchTokenBookNFTsByAccount(walletAddress, {
        key,
        nocache: isRefresh,
        limit,
      })
      if (isStale()) return

      // O(1) dedup across the page — otherwise paginated loads hit O(n²).
      const seenNFTClassIds = new Set(nftClassIds.value)
      // Dedup progress-fetch NFT Class IDs: the API returns one row per owned
      // token_id, so a class with N tokens would otherwise appear N times and
      // inflate chunked settings requests when force-refreshing.
      const progressFetchNFTClassIds = new Set<string>()
      res.data.forEach((nftClass) => {
        const nftClassId = nftClass.address.toLowerCase() as `0x${string}`

        if (!seenNFTClassIds.has(nftClassId)) {
          seenNFTClassIds.add(nftClassId)
          nftClassIds.value.push(nftClassId)
        }
        if (nftClass.token_id) {
          const existing = tokenIdsByNFTClassId.value[nftClassId] ?? []
          if (!existing.includes(nftClass.token_id)) {
            tokenIdsByNFTClassId.value[nftClassId] = [...existing, nftClass.token_id]
          }
        }
        else {
          tokenIdsByNFTClassId.value[nftClassId] ??= []
        }

        if (nftClass.metadata) {
          nftStore.addNFTClassMetadata(nftClassId, nftClass.metadata)
        }

        progressFetchNFTClassIds.add(nftClassId)
      })

      await bookSettingsStore.fetchBatchSettings(Array.from(progressFetchNFTClassIds), { force: isRefresh })
      if (isStale()) return

      nextKey.value = res.pagination.count < limit ? undefined : res.pagination.next_key
      persistedWalletAddress.value = normalizedWalletAddress ?? null
      lastError.value = null
    }
    catch (error) {
      if (isStale()) return
      const statusCode = getErrorStatusCode(error)
      if (statusCode === 404) {
        // NOTE: For a new wallet address, the API will return 404
        nextKey.value = undefined
        persistedWalletAddress.value = normalizedWalletAddress ?? null
        lastError.value = null
        return
      }
      console.warn('Failed to fetch bookshelf items:', error)
      lastError.value = { statusCode: statusCode ?? 0, statusMessage: getErrorMessage(error) }
    }
    finally {
      if (!isStale()) {
        isFetching.value = false
        hasFetched.value = true
      }
    }
  }

  async function fetchAllItems({
    walletAddress,
    isRefresh = false,
  }: {
    walletAddress: string
    isRefresh?: boolean
  }) {
    await fetchItems({ walletAddress, isRefresh })
    while (nextKey.value) {
      const previousNextKey = nextKey.value
      await fetchItems({ walletAddress })
      if (nextKey.value === previousNextKey) {
        break
      }
    }
  }

  async function fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(
    nftClassId: string,
    ownerWalletAddress: string,
    { isRefresh = false }: { isRefresh?: boolean } = {},
  ) {
    const normalizedNFTClassId = nftClassId.toLowerCase()

    const hasNFTClass = nftClassIds.value.includes(normalizedNFTClassId)
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
      if (!nftClassIds.value.includes(normalizedNFTClassId)) {
        nftClassIds.value.push(normalizedNFTClassId)
      }

      if (tokenId) {
        tokenIdsByNFTClassId.value[normalizedNFTClassId] = [tokenId]
      }
    }
  }

  function updateProgress(nftClassId: string, progress: number, lastOpenedTime: number) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'progress', progress)
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'lastOpenedTime', lastOpenedTime)
  }

  function archiveBook(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'archivedAt', Date.now())
  }

  function unarchiveBook(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'archivedAt', null)
  }

  function reset() {
    resetGeneration += 1
    isFetching.value = false
    hasFetched.value = false
    nftClassIds.value = []
    tokenIdsByNFTClassId.value = {}
    nextKey.value = undefined
    persistedWalletAddress.value = null
    lastError.value = null
  }

  watch(hasLoggedIn, (value, oldValue) => {
    // NOTE: Reset the store when user logs out
    if (oldValue && !value) {
      reset()
    }
  })

  return {
    // Must be returned so Pinia exposes them on $state for persist.pick.
    nftClassIds,
    tokenIdsByNFTClassId,
    persistedWalletAddress,

    isFetching,
    hasFetched,
    nextKey,
    lastError,

    items,

    fetchItems,
    fetchAllItems,
    getTokenIdsByNFTClassId,
    getFirstTokenIdByNFTClassId,
    fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract,
    updateProgress,
    archiveBook,
    unarchiveBook,
    reset,
  }
}, {
  persist: {
    pick: ['nftClassIds', 'tokenIdsByNFTClassId', 'persistedWalletAddress'],
  },
})
