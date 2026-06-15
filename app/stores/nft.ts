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

  const getNFTClassById = computed(() => (id: string) => nftClassByIdMap.value[normalizeNFTClassId(id)])
  const getIsNFTClassMetadataFresh = computed(() => (id: string) =>
    revalidatedNFTClassIds.value.has(normalizeNFTClassId(id)))
  const getNFTClassMetadataById = computed(() => (id: string) => {
    const nftClass = getNFTClassById.value(id)
    return nftClass?.metadata
  })
  const getMessagesByNFTClassId = computed(() => (id: string) => messagesByNFTClassIdMap.value[id])

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

  // Refetches the displayed aspects (class + bookstore) in the background,
  // coalescing concurrent callers and bounding fan-out. Goes through the CDN
  // cache (no nocache) — enough to heal a days-old persisted entry — and keeps
  // serving the cached value if it fails.
  function revalidateNFTClassAggregatedMetadataById(nftClassId: string) {
    const key = normalizeNFTClassId(nftClassId)
    const existing = inflightRevalidations.get(key)
    if (existing) return existing
    const promise = new Promise<void>((resolve) => {
      queuedRevalidations.push(() => {
        fetchNFTClassAggregatedMetadataById(nftClassId, { include: ['class_chain', 'bookstore'] })
          .catch(() => { /* keep the cached value; retry on a later session */ })
          .finally(() => {
            activeRevalidationCount -= 1
            inflightRevalidations.delete(key)
            resolve()
            runNextRevalidation()
          })
      })
      runNextRevalidation()
    })
    inflightRevalidations.set(key, promise)
    return promise
  }

  // Awaits live class + bookstore metadata for class IDs not yet fresh this
  // session. Callers that must filter on authoritative data (the library's
  // Plus-reading gate) use this; render paths use lazyFetch's SWR instead.
  async function ensureNFTClassAggregatedMetadataFresh(nftClassIds: string[]) {
    const pendingIds = [...new Set(nftClassIds.map(id => normalizeNFTClassId(id)).filter(Boolean))]
      .filter(id => !getIsNFTClassMetadataFresh.value(id))
    if (!pendingIds.length) return
    await Promise.all(pendingIds.map(id => revalidateNFTClassAggregatedMetadataById(id)))
    // Revalidation swallows per-item errors to keep serving the cache, so a
    // total failure (e.g. metadata API down) would otherwise leave the gated
    // listing silently empty. Surface it only when nothing could be confirmed
    // so the caller shows a retryable error; partial failures just drop items.
    if (pendingIds.every(id => !getIsNFTClassMetadataFresh.value(id))) {
      throw new Error('NFT_CLASS_METADATA_REVALIDATION_FAILED')
    }
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

    addNFTClass,
    addNFTClasses,
    addNFTClassMetadata,
    fetchNFTClassAggregatedMetadataById,
    lazyFetchNFTClassAggregatedMetadataById,
    ensureNFTClassAggregatedMetadataFresh,
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
