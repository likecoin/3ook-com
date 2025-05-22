interface BookstoreCMSTagItem {
  items: BookstoreCMSProductItem[]
  isFetching: boolean
  hasFetched: boolean
  offset?: string
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

  const bookstoreCMSTagsByIdMap = ref<Record<string, BookstoreCMSTagItem>>({})
  const getBookstoreCMSTagById = computed(() => (tagId: string) => {
    return {
      items: bookstoreCMSTagsByIdMap.value[tagId]?.items || [],
      isFetchingItems: bookstoreCMSTagsByIdMap.value[tagId]?.isFetching || false,
      hasFetchedItems: bookstoreCMSTagsByIdMap.value[tagId]?.hasFetched || false,
      nextItemsKey: bookstoreCMSTagsByIdMap.value[tagId]?.offset || undefined,
    }
  })

  async function fetchCMSProductsByTagId(tagId: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    try {
      if (!bookstoreCMSTagsByIdMap.value[tagId]) {
        bookstoreCMSTagsByIdMap.value[tagId] = {
          items: [],
          isFetching: false,
          hasFetched: false,
          offset: undefined,
        }
      }
      if (bookstoreCMSTagsByIdMap.value[tagId]?.isFetching) {
        return
      }
      bookstoreCMSTagsByIdMap.value[tagId].isFetching = true
      const result = await fetchBookstoreCMSProductsByTagId(tagId, {
        offset: isRefresh ? undefined : bookstoreCMSTagsByIdMap.value[tagId]?.offset,
      })

      if (isRefresh) {
        bookstoreCMSTagsByIdMap.value[tagId].items = result.records
      }
      else {
        bookstoreCMSTagsByIdMap.value[tagId].items.push(...result.records)
      }
      bookstoreCMSTagsByIdMap.value[tagId].offset = result.offset
    }
    finally {
      bookstoreCMSTagsByIdMap.value[tagId].isFetching = false
      bookstoreCMSTagsByIdMap.value[tagId].hasFetched = true
    }
  }

  return {
    bookstoreInfoByNFTClassIdMap,

    getBookstoreInfoByNFTClassId,

    addBookstoreInfoByNFTClassId,

    /* Bookstore CMS */

    bookstoreCMSTagsByIdMap,

    getBookstoreCMSTagById,

    fetchCMSProductsByTagId,
  }
})
