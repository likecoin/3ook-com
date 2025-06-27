interface BookstoreCMSTagProducts {
  items: BookstoreCMSProduct[]
  isFetching: boolean
  hasFetched: boolean
  offset?: string
  ts?: number
}

export const useBookstoreStore = defineStore('bookstore', () => {
  const bookstoreInfoByNFTClassIdMap = ref<Record<string, BookstoreInfo>>({})

  const getBookstoreInfoByNFTClassId = computed(() => (nftClassId: string) => {
    return bookstoreInfoByNFTClassIdMap.value[nftClassId]
  })

  function addBookstoreInfoByNFTClassId(nftClassId: string, data: BookstoreInfo) {
    bookstoreInfoByNFTClassIdMap.value[nftClassId] = data
  }

  /* Bookstore CMS */

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
        ts: Date.now(),
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

  return {
    bookstoreInfoByNFTClassIdMap,

    getBookstoreInfoByNFTClassId,

    addBookstoreInfoByNFTClassId,

    /* Bookstore CMS */

    bookstoreCMSProductsByTagIdMap,

    getBookstoreCMSProductsByTagId,

    fetchCMSProductsByTagId,
  }
})
