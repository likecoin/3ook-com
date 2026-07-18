export interface BookshelfItem {
  nftClassId: string
  nftIds: string[]
  lastOpenedTime: number
  progress: number
  completedAt?: number | null
  didNotFinishAt?: number | null
  archivedAt?: number | null
  totalReadingTimeMs: number
  totalTTSListeningTimeMs: number
}

export const useBookshelfStore = defineStore('bookshelf', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const queryCache = useQueryCache()
  const likeNFTClassContract = useLikeNFTClassContract()
  const bookSettingsStore = useBookSettingsStore()
  const preLentBookSessionAPI = usePreLentBookSessionAPI()

  const nftClassIds = ref<string[]>([])
  const tokenIdsByNFTClassId = ref<Record<string, string[]>>({})
  // Borrowed (non-owned) Plus-reading books, most-recent first. LRU-capped at 20
  // server-side; the only terminal action is "return" (drop). See api-user.ts.
  const plusReadingBookIds = ref<string[]>([])
  const hasFetchedPlusReadingBooks = ref(false)
  let plusReadingBooksPromise: Promise<void> | null = null
  const preLentNFTClassIds = ref<string[]>([])
  const isFetchingPreLentBooks = ref(false)
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

  function getIsBookNFTClass(nftClassId: string) {
    return getNFTClassMetadataByIdFromCache(queryCache, nftClassId)?.['@type'] === 'Book'
  }

  function buildBookshelfItem(nftClassId: string, nftIds: string[]): BookshelfItem {
    const settings = bookSettingsStore.getSettings(nftClassId)
    return {
      nftClassId,
      nftIds,
      lastOpenedTime: settings?.lastOpenedTime || 0,
      progress: settings?.progress || 0,
      completedAt: settings?.completedAt,
      didNotFinishAt: settings?.didNotFinishAt,
      archivedAt: settings?.archivedAt,
      totalReadingTimeMs: settings?.totalReadingTimeMs || 0,
      totalTTSListeningTimeMs: settings?.totalTTSListeningTimeMs || 0,
    }
  }

  const items = computed<BookshelfItem[]>(() =>
    nftClassIds.value
      .filter(getIsBookNFTClass)
      .map(nftClassId => buildBookshelfItem(nftClassId, tokenIdsByNFTClassId.value[nftClassId] || [])),
  )

  const ownedNFTClassIdSet = computed(() =>
    new Set(nftClassIds.value.map(id => id.toLowerCase())),
  )

  // Borrowed Plus-reading books are listed via a dedicated endpoint (they live
  // outside the NFT-ownership-driven `items`). Deduped against owned books, and
  // gated on Book metadata so the cover/title can render.
  const plusReadingItems = computed<BookshelfItem[]>(() => {
    return plusReadingBookIds.value
      .filter(nftClassId => !ownedNFTClassIdSet.value.has(nftClassId))
      .filter(getIsBookNFTClass)
      .map(nftClassId => buildBookshelfItem(nftClassId, []))
  })

  // Pre-lent ids excluding owned/borrowed/returned
  const visiblePreLentNFTClassIds = computed<string[]>(() => {
    const borrowedNFTClassIds = new Set(plusReadingBookIds.value)
    return preLentNFTClassIds.value.filter(nftClassId =>
      !ownedNFTClassIdSet.value.has(nftClassId)
      && !borrowedNFTClassIds.has(nftClassId)
      && bookSettingsStore.getSettings(nftClassId)?.preLentReturnedAt == null,
    )
  })

  const preLentItems = computed<BookshelfItem[]>(() =>
    visiblePreLentNFTClassIds.value
      .filter(getIsBookNFTClass)
      .map(nftClassId => buildBookshelfItem(nftClassId, [])),
  )

  // Hydrate aggregated metadata + book settings
  async function hydrateShelfBooks(ids: string[]) {
    await Promise.allSettled([
      ...ids.map(id => ensureNFTClassAggregatedMetadataThroughCache(queryCache, id)),
      // Force-refresh: reading/TTS totals accumulate server-side and would otherwise go stale.
      bookSettingsStore.fetchBatchSettings(ids, { force: true }),
    ])
  }

  async function fetchPlusReadingBooks() {
    if (!hasLoggedIn.value) return
    try {
      const ids = await $fetch('/api/books/plus-reading')
      plusReadingBookIds.value = ids.map(id => id.toLowerCase())
      hasFetchedPlusReadingBooks.value = true
      if (!plusReadingBookIds.value.length) return
      await hydrateShelfBooks(plusReadingBookIds.value)
    }
    catch (error) {
      console.warn('Failed to fetch plus reading books:', error)
    }
  }

  async function lazyFetchPlusReadingBooks() {
    if (hasFetchedPlusReadingBooks.value) return
    if (!plusReadingBooksPromise) {
      plusReadingBooksPromise = fetchPlusReadingBooks().finally(() => {
        plusReadingBooksPromise = null
      })
    }
    return plusReadingBooksPromise
  }

  async function fetchPreLentBooks() {
    if (!hasLoggedIn.value || isFetchingPreLentBooks.value) return
    const generation = resetGeneration
    const isStale = () => !hasLoggedIn.value || generation !== resetGeneration
    try {
      isFetchingPreLentBooks.value = true
      const ids = await preLentBookSessionAPI.fetchPreLentNFTClassIds()
      if (isStale()) return
      preLentNFTClassIds.value = ids.map(id => id.toLowerCase())
      if (!preLentNFTClassIds.value.length) return
      await hydrateShelfBooks(preLentNFTClassIds.value)
    }
    catch (error) {
      console.warn('Failed to fetch pre-lent books:', error)
    }
    finally {
      isFetchingPreLentBooks.value = false
    }
  }

  async function markPreLentBookReturned(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    preLentNFTClassIds.value = preLentNFTClassIds.value.filter(id => id !== normalizedNFTClassId)
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'preLentReturnedAt', true)
    await bookSettingsStore.flushBatch(normalizedNFTClassId)
  }

  async function returnBook(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    const promises: Promise<void>[] = []
    if (preLentNFTClassIds.value.includes(normalizedNFTClassId)) {
      promises.push(markPreLentBookReturned(normalizedNFTClassId))
    }
    if (plusReadingBookIds.value.includes(normalizedNFTClassId)) {
      promises.push(removePlusReadingBook(normalizedNFTClassId))
    }
    await Promise.all(promises)
  }

  // "Return" a borrowed book: drop it from the shelf entirely (progress kept).
  async function removePlusReadingBook(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    plusReadingBookIds.value = plusReadingBookIds.value.filter(id => id !== normalizedNFTClassId)
    try {
      await $fetch(`/api/books/plus-reading/${normalizedNFTClassId}`, { method: 'DELETE' })
    }
    catch (error) {
      console.warn('Failed to remove plus reading book:', error)
    }
  }

  // Registers/refreshes a borrow when opened in the reader, moving it to the
  // front (most-recent). Skips the write when it's already the most-recent
  // borrow, so refreshes / format switches that re-mount don't re-POST.
  async function registerPlusReadingOpen(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    if (plusReadingBookIds.value[0] === normalizedNFTClassId) return
    plusReadingBookIds.value = [
      normalizedNFTClassId,
      ...plusReadingBookIds.value.filter(id => id !== normalizedNFTClassId),
    ]
    try {
      await $fetch(`/api/books/plus-reading/${normalizedNFTClassId}`, { method: 'POST' })
    }
    catch (error) {
      console.warn('Failed to register plus reading book:', error)
    }
  }

  async function fetchItems({
    walletAddress,
    isRefresh: shouldRefresh = false,
    limit = 100,
    shouldForceFetchSettings,
  }: {
    walletAddress: string
    isRefresh?: boolean
    limit?: number
    // Force-refetch book settings and overwrite cached metadata even when
    // already cached. Defaults to the resolved refresh flag; the claim poll
    // opts out so repeated polls hydrate newly-delivered books once instead of
    // re-fetching every iteration.
    shouldForceFetchSettings?: boolean
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

    // A forced refresh fetches `nocache`, so overwrite cached settings and
    // metadata with the authoritative response; otherwise first-write-wins
    // (the claim poll opts out — see shouldForceFetchSettings doc above).
    const shouldForceRefreshCache = shouldForceFetchSettings ?? isRefresh

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

        if (nftClass.metadata && (shouldForceRefreshCache || !getNFTClassMetadataByIdFromCache(queryCache, nftClassId))) {
          setNFTClassData(queryCache, nftClassId, { metadata: nftClass.metadata })
        }

        progressFetchNFTClassIds.add(nftClassId)
      })

      await bookSettingsStore.fetchBatchSettings(Array.from(progressFetchNFTClassIds), { force: shouldForceRefreshCache })
      if (isStale()) return

      nextKey.value = res.data.length < limit ? undefined : res.pagination.next_key
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
    // Track visited cursors so a misbehaving indexer cursor that cycles
    // (A→B→A) can't loop forever — the exact-repeat check alone misses cycles.
    const visitedKeys = new Set<number>()
    while (nextKey.value) {
      if (visitedKeys.has(nextKey.value)) {
        break
      }
      visitedKeys.add(nextKey.value)
      await fetchItems({ walletAddress })
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
    const existingMetadata = getNFTClassMetadataByIdFromCache(queryCache, normalizedNFTClassId)

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
        setNFTClassData(queryCache, normalizedNFTClassId, { metadata: nftClassMetadata })
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

  function markBookAsFinished(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'completedAt', true)
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'didNotFinishAt', null)
  }

  function markBookAsDidNotFinish(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'didNotFinishAt', true)
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'completedAt', null)
  }

  function markBookAsReading(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'completedAt', null)
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'didNotFinishAt', null)
  }

  function archiveBook(nftClassId: string) {
    const normalizedNFTClassId = nftClassId.toLowerCase()
    bookSettingsStore.queueUpdate(normalizedNFTClassId, 'archivedAt', true)
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
    plusReadingBookIds.value = []
    hasFetchedPlusReadingBooks.value = false
    plusReadingBooksPromise = null
    preLentNFTClassIds.value = []
    isFetchingPreLentBooks.value = false
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
    plusReadingBookIds,
    persistedWalletAddress,

    isFetching,
    hasFetched,
    nextKey,
    lastError,

    items,
    plusReadingItems,

    isFetchingPreLentBooks,
    preLentNFTClassIds,
    visiblePreLentNFTClassIds,
    preLentItems,

    fetchItems,
    fetchAllItems,
    fetchPlusReadingBooks,
    lazyFetchPlusReadingBooks,
    fetchPreLentBooks,
    returnBook,
    getTokenIdsByNFTClassId,
    getFirstTokenIdByNFTClassId,
    fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract,
    updateProgress,
    markBookAsFinished,
    markBookAsDidNotFinish,
    markBookAsReading,
    removePlusReadingBook,
    registerPlusReadingOpen,
    archiveBook,
    unarchiveBook,
    reset,
  }
}, {
  persist: {
    pick: ['nftClassIds', 'tokenIdsByNFTClassId', 'plusReadingBookIds', 'preLentNFTClassIds', 'persistedWalletAddress'],
  },
})
