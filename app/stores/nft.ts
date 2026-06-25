export const useNFTStore = defineStore('nft', () => {
  const bookstoreStore = useBookstoreStore()

  const nftClassByIdMap = ref<Record<string, Partial<NFTClass>>>({})
  const messagesByNFTClassIdMap = ref<Record<string, NFTBuyerMessage[]>>({})

  // Class IDs whose class + bookstore metadata was fetched live this session.
  // Those caches are persisted to localStorage and hydrate stale; this set
  // (never persisted) marks what's been revalidated since load and drives the
  // stale-while-revalidate path in lazyFetch.
  const revalidatedNFTClassIds = ref<Set<string>>(new Set())
  // In-flight background revalidations, coalesced by class ID. A bounded runner
  // caps fan-out so a freshly-loaded grid of cached books doesn't fire one
  // request per item at once.
  const inflightRevalidations = new Map<string, Promise<unknown>>()
  const queuedRevalidations: Array<() => void> = []
  let activeRevalidationCount = 0
  const MAX_CONCURRENT_REVALIDATIONS = 6
  // Reactive count of class IDs with a queued or in-flight background revalidation.
  // Drives a loading signal for views (the library tab) whose filter hides items
  // until their authoritative metadata lands.
  const revalidatingCount = ref(0)

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[normalizeNFTClassId(id)])
  const getIsNFTClassMetadataFresh = computed(() => (id: string) =>
    revalidatedNFTClassIds.value.has(normalizeNFTClassId(id)))
  const getNFTClassMetadataById = computed(() => (id: string) => {
    const nftClass = getNFTClassById.value(id)
    return nftClass?.metadata
  })
  const getMessagesByNFTClassId = computed(() => (id: string) => messagesByNFTClassIdMap.value[id])
  const isRevalidatingMetadata = computed(() => revalidatingCount.value > 0)

  function addNFTClass(nftClass: Partial<NFTClass>) {
    if (nftClass.address) {
      const nftClassId = normalizeNFTClassId(nftClass.address)
      nftClassByIdMap.value[nftClassId] = {
        ...nftClassByIdMap.value[nftClassId],
        ...nftClass,
        address: nftClassId,
      }
    }
  }

  function addNFTClassMetadata(nftClassId: string, nftClassMetadata: NFTClassMetadata) {
    const normalizedNFTClassId = normalizeNFTClassId(nftClassId)
    nftClassByIdMap.value[normalizedNFTClassId] = {
      ...(nftClassByIdMap.value[normalizedNFTClassId] || {}),
      metadata: nftClassMetadata,
    }
  }

  function addNFTClasses(nftClasses: NFTClass[]) {
    const nftClassIds: string[] = []
    for (const nftClass of nftClasses) {
      nftClassIds.push(normalizeNFTClassId(nftClass.address))
      addNFTClass(nftClass)
    }
    return nftClassIds
  }

  async function fetchNFTClassAggregatedMetadataById(nftClassId: string, options?: FetchLikeCoinNFTClassAggregatedMetadataOptions) {
    const data = await fetchCachedLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
    if (data.classData) {
      addNFTClassMetadata(nftClassId, data.classData as NFTClassMetadata)
    }
    if (data.bookstoreInfo !== undefined) {
      bookstoreStore.addBookstoreInfoByNFTClassId(nftClassId, data.bookstoreInfo)
    }
    // Count as fresh when both displayed aspects were requested — not when the
    // payload is truthy. A partial (e.g. purchase-only) fetch then can't
    // suppress revalidation, while a legitimately null classData still marks
    // the class fresh instead of leaving it perpetually stale.
    const requestedOptions = resolveLikeCoinNFTMetadataDataOptions(options)
    if (requestedOptions.includes('class_chain') && requestedOptions.includes('bookstore')) {
      revalidatedNFTClassIds.value.add(normalizeNFTClassId(nftClassId))
    }
    return data
  }

  function runNextRevalidation() {
    if (activeRevalidationCount >= MAX_CONCURRENT_REVALIDATIONS) return
    const next = queuedRevalidations.shift()
    if (!next) return
    activeRevalidationCount += 1
    next()
  }

  // Background revalidation: coalesced, bounded fan-out. nocache is required —
  // the LikeCoin CDN serves a 24h stale-while-revalidate body, so a plain refetch
  // loops on the stale value and never heals a corrected field. Keeps cache on failure.
  function revalidateNFTClassAggregatedMetadataById(nftClassId: string) {
    const key = normalizeNFTClassId(nftClassId)
    const existing = inflightRevalidations.get(key)
    if (existing) return existing
    revalidatingCount.value += 1
    const promise = new Promise<void>((resolve) => {
      queuedRevalidations.push(() => {
        fetchNFTClassAggregatedMetadataById(nftClassId, { include: ['class_chain', 'bookstore'], nocache: true })
          .catch(() => { /* keep the cached value; retry on a later session */ })
          .finally(() => {
            activeRevalidationCount -= 1
            inflightRevalidations.delete(key)
            revalidatingCount.value -= 1
            resolve()
            runNextRevalidation()
          })
      })
      runNextRevalidation()
    })
    inflightRevalidations.set(key, promise)
    return promise
  }

  // Proactively revalidates a batch of not-yet-fresh class IDs, fire-and-forget.
  // The library's staking tab filters its candidates out before they render, so
  // they never trigger their own SWR refresh — nudging them here lets the gate
  // reactively re-filter as authoritative flags land.
  function revalidateNFTClassAggregatedMetadata(nftClassIds: string[]) {
    const pendingIds = [...new Set(nftClassIds.map(id => normalizeNFTClassId(id)).filter(Boolean))]
      .filter(id => !getIsNFTClassMetadataFresh.value(id))
    pendingIds.forEach(id => revalidateNFTClassAggregatedMetadataById(id))
  }

  async function lazyFetchNFTClassAggregatedMetadataById(nftClassId: string, { exclude = [], nocache = false }: FetchLikeCoinNFTClassAggregatedMetadataOptions = {}) {
    const excludedOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[] = [...exclude]
    const cachedClassChain = nocache ? undefined : getNFTClassMetadataById.value(nftClassId)
    const cachedBookstore = nocache ? undefined : bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)
    if (cachedClassChain) {
      excludedOptions.push('class_chain')
    }
    if (cachedBookstore) {
      excludedOptions.push('bookstore')
    }
    if (cachedClassChain && cachedBookstore) {
      // Stale-while-revalidate: serve the cached value now, but if it hasn't
      // been confirmed live this session (e.g. hydrated from localStorage),
      // refresh it once in the background so the persisted cache self-heals.
      if (!nocache && !getIsNFTClassMetadataFresh.value(nftClassId)) {
        revalidateNFTClassAggregatedMetadataById(nftClassId)
      }
      return {
        classData: cachedClassChain,
        bookstoreInfo: cachedBookstore,
        ownerInfo: null,
      }
    }
    return fetchNFTClassAggregatedMetadataById(nftClassId, { exclude: excludedOptions, nocache })
  }

  async function fetchNFTClassChainMetadataById(nftClassId: string) {
    const { metadata } = await fetchLikeCoinNFTClassChainMetadataById(nftClassId)
    if (metadata) addNFTClassMetadata(nftClassId, metadata)
    return metadata
  }

  async function lazyFetchNFTClassChainMetadataById(nftClassId: string) {
    if (getNFTClassMetadataById.value(nftClassId)) {
      return getNFTClassMetadataById.value(nftClassId)
    }
    return await fetchNFTClassChainMetadataById(nftClassId)
  }

  async function fetchMessagesByClassId(classId: string) {
    const data = await fetchPurchaseMessagesByNFTClassId(classId)
    messagesByNFTClassIdMap.value[classId] = data.messages

    return messagesByNFTClassIdMap.value[classId]
  }

  async function lazyFetchMessagesByClassId(classId: string) {
    if (messagesByNFTClassIdMap.value[classId]) {
      return messagesByNFTClassIdMap.value[classId]
    }
    return await fetchMessagesByClassId(classId)
  }

  return {
    nftClassByIdMap,
    messagesByNFTClassIdMap,

    getNFTClassById,
    getNFTClassMetadataById,
    getIsNFTClassMetadataFresh,
    getMessagesByNFTClassId,
    isRevalidatingMetadata,

    addNFTClass,
    addNFTClasses,
    addNFTClassMetadata,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
    revalidateNFTClassAggregatedMetadata,
    fetchNFTClassChainMetadataById,
    lazyFetchNFTClassChainMetadataById,
    fetchMessagesByClassId,
    lazyFetchMessagesByClassId,
  }
}, {
  persist: {
    pick: ['nftClassByIdMap'],
  },
})
