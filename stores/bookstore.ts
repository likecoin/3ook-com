interface BookstoreCMSTagProducts {
  items: BookstoreCMSProduct[]
  isFetching: boolean
  hasFetched: boolean
  offset?: string
  ts?: number
}

interface BookstoreSearchResults {
  items: Array<{
    classId: string
    title: string
    imageUrl: string
    minPrice?: number
  }>
  isFetching: boolean
  hasFetched: boolean
  nextKey?: string
}

export const useBookstoreStore = defineStore('bookstore', () => {
  const bookstoreInfoByNFTClassIdMap = ref<Record<string, BookstoreInfo | null>>({})

  const getBookstoreInfoByNFTClassId = computed(() => (nftClassId: string) => {
    return bookstoreInfoByNFTClassIdMap.value[nftClassId]
  })

  function addBookstoreInfoByNFTClassId(nftClassId: string, data: BookstoreInfo | null) {
    bookstoreInfoByNFTClassIdMap.value[nftClassId] = data
  }

  /* Bookstore CMS Products */

  const bookstoreCMSProductsByTagIdMap = ref<Record<string, BookstoreCMSTagProducts>>({})
  const getBookstoreCMSProductsByTagId = computed(() => (tagId: string) => {
    return {
      items: bookstoreCMSProductsByTagIdMap.value[tagId]?.items || [],
      isFetchingItems: bookstoreCMSProductsByTagIdMap.value[tagId]?.isFetching || false,
      hasFetchedItems: bookstoreCMSProductsByTagIdMap.value[tagId]?.hasFetched || false,
      nextItemsKey: bookstoreCMSProductsByTagIdMap.value[tagId]?.offset || undefined,
    }
  })

  async function fetchCMSProductsByTagId(tagId: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    if (bookstoreCMSProductsByTagIdMap.value[tagId]?.isFetching) {
      return
    }
    if (!bookstoreCMSProductsByTagIdMap.value[tagId] || isRefresh) {
      bookstoreCMSProductsByTagIdMap.value[tagId] = {
        items: [],
        isFetching: false,
        hasFetched: false,
        offset: undefined,
        ts: getTimestampRoundedToMinute(),
      }
    }
    try {
      bookstoreCMSProductsByTagIdMap.value[tagId].isFetching = true
      const result = await fetchBookstoreCMSProductsByTagId(tagId, {
        offset: isRefresh ? undefined : bookstoreCMSProductsByTagIdMap.value[tagId]?.offset,
        ts: bookstoreCMSProductsByTagIdMap.value[tagId].ts,
      })

      if (isRefresh) {
        bookstoreCMSProductsByTagIdMap.value[tagId].items = result.records
      }
      else {
        bookstoreCMSProductsByTagIdMap.value[tagId].items.push(...result.records)
      }
      bookstoreCMSProductsByTagIdMap.value[tagId].offset = result.offset
      bookstoreCMSProductsByTagIdMap.value[tagId].hasFetched = true
    }
    catch (error) {
      // HACK: When `hasFetched` is placed inside the finally block, it will execute before `items` are updated.
      bookstoreCMSProductsByTagIdMap.value[tagId].hasFetched = true
      throw error
    }
    finally {
      bookstoreCMSProductsByTagIdMap.value[tagId].isFetching = false
    }
  }

  /* Bookstore CMS Tags */

  const bookstoreCMSTags = ref<Array<BookstoreCMSTag>>([])
  const isFetchingBookstoreCMSTags = ref(false)

  const getBookstoreCMSTagById = computed(() => (tagId: string) => {
    return bookstoreCMSTags.value.find(tag => tag.id === tagId)
  })

  async function fetchBookstoreCMSTags() {
    if (isFetchingBookstoreCMSTags.value) return
    try {
      isFetchingBookstoreCMSTags.value = true
      const result = await fetchBookstoreCMSTagsForAll()
      bookstoreCMSTags.value = result.records
    }
    finally {
      isFetchingBookstoreCMSTags.value = false
    }
  }

  /* Bookstore Search Results */

  const bookstoreSearchResultsByQueryMap = ref<Record<string, BookstoreSearchResults>>({})

  const getBookstoreSearchResultsByQuery = computed(() => (query: string) => {
    const items
      = (bookstoreSearchResultsByQueryMap.value[query]?.items || [])
        .filter((item) => {
          const bookstoreInfo = getBookstoreInfoByNFTClassId.value(item.classId)
          return bookstoreInfo !== null && !bookstoreInfo?.isHidden
        })
    return {
      items,
      isFetchingItems: bookstoreSearchResultsByQueryMap.value[query]?.isFetching || false,
      hasFetchedItems: bookstoreSearchResultsByQueryMap.value[query]?.hasFetched || false,
      nextItemsKey: bookstoreSearchResultsByQueryMap.value[query]?.nextKey || undefined,
    }
  })

  async function fetchSearchResults(type: 'author' | 'publisher', searchTerm: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    const queryKey = `${type}:${searchTerm}`

    if (bookstoreSearchResultsByQueryMap.value[queryKey]?.isFetching) {
      return
    }

    if (!bookstoreSearchResultsByQueryMap.value[queryKey] || isRefresh) {
      bookstoreSearchResultsByQueryMap.value[queryKey] = {
        items: [],
        isFetching: false,
        hasFetched: false,
      }
    }

    try {
      bookstoreSearchResultsByQueryMap.value[queryKey].isFetching = true

      const options = {
        limit: 100,
        key: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      }

      const result = await fetchNFTClassesByMetadata(type, searchTerm, options)

      if (result) {
        const nftClasses = result.data.map(item => ({
          ...item,
          address: item.address.toLowerCase(),
        }))
        const mappedItems = nftClasses
          .map(nftClass => ({
            classId: nftClass.address.toLowerCase(),
            title: nftClass.name || '',
            imageUrl: nftClass.metadata?.image || '',
            minPrice: undefined,
          }))

        if (isRefresh) {
          bookstoreSearchResultsByQueryMap.value[queryKey].items = mappedItems
        }
        else {
          bookstoreSearchResultsByQueryMap.value[queryKey].items.push(...mappedItems)
        }

        bookstoreSearchResultsByQueryMap.value[queryKey].nextKey = result.pagination.count === options.limit ? result.pagination?.next_key?.toString() : undefined
      }
    }
    finally {
      bookstoreSearchResultsByQueryMap.value[queryKey].hasFetched = true
      bookstoreSearchResultsByQueryMap.value[queryKey].isFetching = false
    }
  }

  return {
    bookstoreInfoByNFTClassIdMap,

    getBookstoreInfoByNFTClassId,

    addBookstoreInfoByNFTClassId,

    /* Bookstore CMS Products */

    bookstoreCMSProductsByTagIdMap,

    getBookstoreCMSProductsByTagId,

    fetchCMSProductsByTagId,

    /* Bookstore CMS Tags */

    bookstoreCMSTags,
    isFetchingBookstoreCMSTags,

    getBookstoreCMSTagById,

    fetchBookstoreCMSTags,

    /* Bookstore Search Results */

    bookstoreSearchResultsByQueryMap,

    getBookstoreSearchResultsByQuery,

    fetchSearchResults,
  }
})
