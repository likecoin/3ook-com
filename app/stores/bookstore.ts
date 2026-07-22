import { getBookstoreScopedKey } from '~~/shared/utils/bookstore'

interface BookstoreSearchOptions {
  isRefresh?: boolean
  isLibrary?: boolean
}

interface BookstoreCMSTagProducts {
  items: BookstoreCMSProduct[]
  isFetching: boolean
  hasFetched: boolean
  offset?: string
  mayHaveMore?: boolean
  ts?: number
}

interface BookstoreSearchResults {
  items: Array<{
    classId: string
    title: string
    imageUrl: string
    minPrice?: number
    minPriceInDecimalByCurrency?: BookPriceInDecimalByCurrency
    isPlusReadingEnabled?: boolean
  }>
  isFetching: boolean
  hasFetched: boolean
  nextKey?: string
}

interface StakingBooks {
  items: Array<{
    nftClassId: string
    totalStaked: bigint
    stakerCount: number
    likeRank: number
  }>
  isFetching: boolean
  hasFetched: boolean
  offset?: number | string
}

export const useBookstoreStore = defineStore('bookstore', () => {
  const queryCache = useQueryCache()

  /* Bookstore CMS Products */

  const bookstoreCMSProductsByTagKeyMap = ref<Record<string, BookstoreCMSTagProducts>>({})
  const getBookstoreCMSProductsByTagId = computed(() => (tagId: string, isLibrary = false) => {
    const state = bookstoreCMSProductsByTagKeyMap.value[getBookstoreScopedKey(tagId, isLibrary)]
    return {
      items: state?.items || [],
      isFetchingItems: state?.isFetching || false,
      hasFetchedItems: state?.hasFetched || false,
      nextItemsKey: state?.offset || undefined,
      mayHaveMore: state?.mayHaveMore || false,
    }
  })

  async function fetchCMSProductsByTagId(tagId: string, {
    isRefresh = false,
    isLibrary = false,
  }: {
    isRefresh?: boolean
    isLibrary?: boolean
  } = {}) {
    const tagKey = getBookstoreScopedKey(tagId, isLibrary)
    if (bookstoreCMSProductsByTagKeyMap.value[tagKey]?.isFetching) {
      return
    }

    if (!bookstoreCMSProductsByTagKeyMap.value[tagKey] || isRefresh) {
      bookstoreCMSProductsByTagKeyMap.value[tagKey] = {
        items: [],
        isFetching: false,
        hasFetched: false,
        offset: undefined,
        ts: getTimestampRoundedToMinute(),
      }
    }
    const fetchOffset = isRefresh ? undefined : bookstoreCMSProductsByTagKeyMap.value[tagKey]?.offset
    try {
      bookstoreCMSProductsByTagKeyMap.value[tagKey].isFetching = true
      const result = await fetchBookstoreCMSProductsByTagId(tagId, {
        offset: fetchOffset,
        ts: bookstoreCMSProductsByTagKeyMap.value[tagKey].ts,
        isLibrary,
      })

      if (isRefresh) {
        bookstoreCMSProductsByTagKeyMap.value[tagKey].items = result.records
      }
      else {
        bookstoreCMSProductsByTagKeyMap.value[tagKey].items.push(...result.records)
      }
      bookstoreCMSProductsByTagKeyMap.value[tagKey].offset = result.offset
      bookstoreCMSProductsByTagKeyMap.value[tagKey].mayHaveMore = result.hasMore
      bookstoreCMSProductsByTagKeyMap.value[tagKey].hasFetched = true
    }
    catch (error) {
      // HACK: When `hasFetched` is placed inside the finally block, it will execute before `items` are updated.
      bookstoreCMSProductsByTagKeyMap.value[tagKey].hasFetched = true
      throw error
    }
    finally {
      bookstoreCMSProductsByTagKeyMap.value[tagKey].isFetching = false
    }
  }

  /* Bookstore Search Results */

  const bookstoreSearchResultsByQueryMap = ref<Record<string, BookstoreSearchResults>>({})

  const getBookstoreSearchResultsByQuery = computed(() => (query: string, isLibrary = false) => {
    const queryKey = getBookstoreScopedKey(query, isLibrary)
    const items
      = (bookstoreSearchResultsByQueryMap.value[queryKey]?.items || [])
        .filter((item) => {
          // Reactive cache read: the filter re-runs as book infos land.
          const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, item.classId)
          return bookstoreInfo !== null && !bookstoreInfo?.isHidden
        })
    return {
      items,
      isFetchingItems: bookstoreSearchResultsByQueryMap.value[queryKey]?.isFetching || false,
      hasFetchedItems: bookstoreSearchResultsByQueryMap.value[queryKey]?.hasFetched || false,
      nextItemsKey: bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey || undefined,
    }
  })

  function checkAndInitializeSearchState(queryKey: string, isRefresh: boolean) {
    if (bookstoreSearchResultsByQueryMap.value[queryKey]?.isFetching) {
      return false
    }

    if (!bookstoreSearchResultsByQueryMap.value[queryKey] || isRefresh) {
      bookstoreSearchResultsByQueryMap.value[queryKey] = {
        items: [],
        isFetching: false,
        hasFetched: false,
      }
    }

    bookstoreSearchResultsByQueryMap.value[queryKey].isFetching = true
    return true
  }

  function updateSearchResults(queryKey: string, items: BookstoreSearchResults['items'], nextKey: string | undefined, isRefresh: boolean) {
    const state = bookstoreSearchResultsByQueryMap.value[queryKey]
    if (!state) return

    if (isRefresh) {
      state.items = items
    }
    else {
      state.items.push(...items)
    }
    state.nextKey = nextKey
  }

  function finalizeSearchState(queryKey: string) {
    const state = bookstoreSearchResultsByQueryMap.value[queryKey]
    if (!state) return

    state.hasFetched = true
    state.isFetching = false
  }

  async function fetchTextSearch(searchTerm: string, queryKey: string, { isRefresh, isLibrary }: Required<BookstoreSearchOptions>) {
    const result = await fetchBookstoreCMSPublicationsBySearchTerm(searchTerm, {
      offset: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      ts: getTimestampRoundedToMinute(),
      isLibrary,
    })

    const mappedItems = result.records
      .filter(item => item.classId && item.title && item.imageUrl)
      .map(item => ({
        classId: normalizeNFTClassId(item.classId),
        title: item.title!,
        imageUrl: item.imageUrl!,
        minPrice: item.minPrice,
        minPriceInDecimalByCurrency: item.minPriceInDecimalByCurrency,
        isPlusReadingEnabled: item.isPlusReadingEnabled,
      }))

    updateSearchResults(queryKey, mappedItems, result.offset, isRefresh)
  }

  async function fetchGenreSearch(genre: string, queryKey: string, { isRefresh, isLibrary }: Required<BookstoreSearchOptions>) {
    const result = await fetchBookstoreCMSPublicationsByGenre(genre, {
      offset: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      ts: getTimestampRoundedToMinute(),
      isLibrary,
    })

    const mappedItems = result.records
      .filter(item => item.classId && item.title && item.imageUrl)
      .map(item => ({
        classId: normalizeNFTClassId(item.classId),
        title: item.title!,
        imageUrl: item.imageUrl!,
        minPrice: item.minPrice,
        minPriceInDecimalByCurrency: item.minPriceInDecimalByCurrency,
        isPlusReadingEnabled: item.isPlusReadingEnabled,
      }))

    updateSearchResults(queryKey, mappedItems, result.offset, isRefresh)
  }

  async function fetchMetadataSearch(type: 'author' | 'publisher', searchTerm: string, queryKey: string, isRefresh: boolean) {
    const options = {
      limit: 100,
      key: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
    }

    const result = await fetchNFTClassesByMetadata(type, searchTerm, options)

    if (result) {
      const nftClasses = result.data.map(item => ({
        ...item,
        address: normalizeNFTClassId(item.address),
      }))
      const mappedItems = nftClasses
        .map(nftClass => ({
          classId: nftClass.address,
          title: nftClass.name || '',
          imageUrl: nftClass.metadata?.image || '',
          minPrice: undefined,
        }))

      const nextKey = getIndexerNextKey(result, options.limit)?.toString()
      updateSearchResults(queryKey, mappedItems, nextKey, isRefresh)
    }
  }

  async function fetchOwnerWalletSearch(walletAddress: string, queryKey: string, isRefresh: boolean) {
    const options = {
      limit: 100,
      key: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      isBooksOnly: true,
    }

    const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, options)

    if (result) {
      const nftClasses = result.data.map(item => ({
        ...item,
        address: normalizeNFTClassId(item.address),
      }))
      const mappedItems = nftClasses
        .map(nftClass => ({
          classId: nftClass.address,
          title: nftClass.name || '',
          imageUrl: nftClass.metadata?.image || '',
          minPrice: undefined,
        }))

      const nextKey = getIndexerNextKey(result, options.limit)?.toString()
      updateSearchResults(queryKey, mappedItems, nextKey, isRefresh)
    }
  }

  async function fetchSearchResults(
    type: 'q' | 'author' | 'publisher' | 'owner_wallet' | 'genre',
    searchTerm: string,
    {
      isRefresh = false,
      isLibrary = false,
    }: BookstoreSearchOptions = {},
  ) {
    const queryKey = getBookstoreScopedKey(`${type}:${searchTerm}`, isLibrary)

    if (!checkAndInitializeSearchState(queryKey, isRefresh)) {
      return
    }

    try {
      if (type === 'q') {
        await fetchTextSearch(searchTerm, queryKey, { isRefresh, isLibrary })
      }
      else if (type === 'genre') {
        await fetchGenreSearch(searchTerm, queryKey, { isRefresh, isLibrary })
      }
      else if (type === 'owner_wallet') {
        if (checkIsEVMAddress(searchTerm)) {
          await fetchOwnerWalletSearch(searchTerm, queryKey, isRefresh)
        }
      }
      else {
        await fetchMetadataSearch(type, searchTerm, queryKey, isRefresh)
      }
    }
    finally {
      finalizeSearchState(queryKey)
    }
  }

  /* Affiliate Books */

  // The affiliate store view unions the affiliate's hand-picked classIds with the
  // first page of books from each affiliate publisher wallet, deduped into one
  // flat list reusing the search-results pipeline. No pagination: publisher
  // overflow is reached via the per-publisher owner_wallet link in the header.
  async function fetchAffiliateBooks(likerId: string, { isRefresh = false, isLibrary = false }: BookstoreSearchOptions = {}) {
    const queryKey = getBookstoreScopedKey(`affiliate:${likerId}`, isLibrary)

    if (!checkAndInitializeSearchState(queryKey, isRefresh)) {
      return
    }

    try {
      const config = await fetchAffiliateStoreConfigThroughCache(queryCache, likerId)

      if (!config?.active) {
        updateSearchResults(queryKey, [], undefined, true)
        return
      }

      const seen = new Set<string>()
      const items: BookstoreSearchResults['items'] = []

      // Resolve hand-picked classIds (so their titles/covers render and the
      // getBookstoreSearchResultsByQuery info-filter keeps them) and each
      // publisher's first page concurrently — the two batches are independent.
      const [, walletResults] = await Promise.all([
        Promise.all(config.affiliateClassIds.map(classId =>
          fetchNFTClassAggregatedMetadataThroughCache(queryCache, classId).catch(() => { /* ignore */ }),
        )),
        Promise.all(config.affiliatePublisherWallets.map(wallet =>
          fetchNFTClassesByOwnerWalletAddress(wallet, { limit: 100, isBooksOnly: true }).catch(() => null),
        )),
      ])

      // Library gates on isPlusReadingEnabled, absent on indexer-sourced publisher
      // books; revalidate their bookstore info (queued, fire-and-forget) so the
      // Plus-reading filter keeps them — the revalidating signal holds the skeleton.
      if (isLibrary) {
        revalidateNFTClassAggregatedMetadata(
          queryCache,
          walletResults.flatMap(result => result?.data?.map(nftClass => nftClass.address) ?? []),
        )
      }

      config.affiliateClassIds.forEach((rawClassId) => {
        const classId = normalizeNFTClassId(rawClassId)
        if (seen.has(classId)) return
        const info = getBookstoreInfoByNFTClassIdFromCache(queryCache, classId)
        if (!info || info.isHidden) return
        seen.add(classId)
        items.push({
          classId,
          title: info.name,
          imageUrl: info.thumbnailUrl,
          isPlusReadingEnabled: info.isPlusReadingEnabled,
        })
      })

      // Append the first page of each publisher wallet's books.
      walletResults.forEach((result) => {
        result?.data?.forEach((nftClass) => {
          const classId = normalizeNFTClassId(nftClass.address)
          if (seen.has(classId)) return
          seen.add(classId)
          items.push({
            classId,
            title: nftClass.name || '',
            imageUrl: nftClass.metadata?.image || '',
          })
        })
      })

      updateSearchResults(queryKey, items, undefined, true)
    }
    finally {
      finalizeSearchState(queryKey)
    }
  }

  /* Staking Books */

  const stakingBooksMap = ref<Record<string, StakingBooks>>({})

  const getStakingBooks = computed(() => (sortBy: string) => {
    return {
      items: stakingBooksMap.value[sortBy]?.items || [],
      isFetchingItems: stakingBooksMap.value[sortBy]?.isFetching || false,
      hasFetchedItems: stakingBooksMap.value[sortBy]?.hasFetched || false,
      nextItemsKey: stakingBooksMap.value[sortBy]?.offset || undefined,
    }
  })

  async function fetchStakingBooks(sortBy: string, { isRefresh = false, limit = 30 } = {}) {
    if (stakingBooksMap.value[sortBy]?.isFetching) {
      return
    }
    if (!isRefresh && stakingBooksMap.value[sortBy]?.hasFetched && !stakingBooksMap.value[sortBy]?.offset) {
      return
    }
    if (!stakingBooksMap.value[sortBy] || isRefresh) {
      stakingBooksMap.value[sortBy] = {
        // Keep any existing items visible during a refresh so a background
        // revalidation doesn't flash the grid empty; replaced on success.
        items: stakingBooksMap.value[sortBy]?.items ?? [],
        isFetching: false,
        hasFetched: false,
        offset: undefined,
      }
    }

    try {
      stakingBooksMap.value[sortBy].isFetching = true

      const result = await fetchStakingBookNFTs({
        sortBy: sortBy as 'staked_amount' | 'last_staked_at' | 'number_of_stakers',
        sortOrder: 'desc',
        limit,
        key: stakingBooksMap.value[sortBy].offset,
      })

      const currentOffset = Number(stakingBooksMap.value[sortBy].offset ?? 0)
      const isStartingFromFirstPage = currentOffset === 0
      const bookNFTs = result.data
        .filter(bookNFT => BigInt(bookNFT.staked_amount || 0) > 0)
        .map((bookNFT, index) => ({
          nftClassId: normalizeNFTClassId(bookNFT.evm_address),
          totalStaked: BigInt(bookNFT.staked_amount || 0),
          stakerCount: bookNFT.number_of_stakers,
          lastStakedAt: bookNFT.last_staked_at,
          likeRank: currentOffset + index + 1,
        }))

      // A failed refresh keeps items but clears the cursor, so page 1 must replace, not append.
      if (isStartingFromFirstPage) {
        stakingBooksMap.value[sortBy].items = bookNFTs
      }
      else {
        // The indexer paginates by numeric offset over a live staking ranking, so a book
        // whose rank shifts across the page boundary can come back on both pages.
        const seenNFTClassIds = new Set(stakingBooksMap.value[sortBy].items.map(item => item.nftClassId))
        stakingBooksMap.value[sortBy].items.push(
          ...bookNFTs.filter(bookNFT => !seenNFTClassIds.has(bookNFT.nftClassId)),
        )
      }

      stakingBooksMap.value[sortBy].offset = getIndexerNextKey(result, limit)?.toString()
      stakingBooksMap.value[sortBy].hasFetched = true
    }
    finally {
      stakingBooksMap.value[sortBy].isFetching = false
    }
  }

  return {
    /* Bookstore CMS Products */

    bookstoreCMSProductsByTagKeyMap,

    getBookstoreCMSProductsByTagId,

    fetchCMSProductsByTagId,

    /* Bookstore Search Results */

    bookstoreSearchResultsByQueryMap,

    getBookstoreSearchResultsByQuery,

    fetchSearchResults,

    /* Affiliate Books */

    fetchAffiliateBooks,

    /* Staking Books */

    stakingBooksMap,

    getStakingBooks,

    fetchStakingBooks,
  }
}, {
  persist: {
    // Best-effort offline support for the store landing: persist the staking
    // ranked lists. The tag chips and book infos they render live in the Pinia
    // Colada query cache, persisted by its cache-persister plugin.
    pick: [
      'stakingBooksMap',
    ],
    // totalStaked is a BigInt; the default JSON serializer throws on it and the
    // write is silently dropped, so round-trip BigInt through a tagged string.
    serializer: {
      serialize: state => JSON.stringify(state, (_, value) =>
        typeof value === 'bigint' ? `$bigint:${value}` : value),
      deserialize: str => JSON.parse(str, (_, value) => {
        if (typeof value === 'string' && value.startsWith('$bigint:')) {
          // Corrupted/edited storage could hold an invalid bigint payload;
          // BigInt() would throw inside the reviver and abort the whole parse.
          try {
            return BigInt(value.slice(8))
          }
          catch {
            return value
          }
        }
        return value
      }),
    },
    // A persisted isFetching:true (app killed mid-fetch) would dead-lock the
    // guard in fetchStakingBooks, so clear in-flight flags on restore.
    afterHydrate: ({ store }) => {
      // Corrupted/version-skewed storage could hydrate a non-object here; a throw
      // would abort afterHydrate and break hydration of the whole store.
      const map = store.stakingBooksMap as unknown
      if (!map || typeof map !== 'object') return
      for (const entry of Object.values(map as Record<string, StakingBooks>)) {
        if (entry && typeof entry === 'object') entry.isFetching = false
      }
    },
  },
})
