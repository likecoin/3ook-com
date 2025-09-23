export const useBookListStore = defineStore('book-list', () => {
  const itemsMap = ref<Map<string, BookListItem>>(new Map<string, BookListItem>())
  const isLoading = ref(false)

  const items = computed(() => [...itemsMap.value.values()])
  const count = computed(() => itemsMap.value.size)

  async function loadItems() {
    isLoading.value = true
    try {
      const response = await $fetch<{ items: BookListItem[] }>('/api/book-list/all')

      itemsMap.value.clear()
      response.items.forEach((item: BookListItem) => {
        const itemId = getBookListItemId(item.nftClassId, item.priceIndex)
        itemsMap.value.set(itemId, item)
      })
    }
    catch (error) {
      console.error('[book-list store] Failed to load book list items', error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function checkItemExists(nftClassId: string, priceIndex: number): Promise<boolean> {
    const itemId = getBookListItemId(nftClassId, priceIndex)

    // Check if we already have this item in our cache
    if (itemsMap.value.has(itemId)) {
      return true
    }

    try {
      const item = await $fetch<BookListItem>('/api/book-list', {
        query: {
          nft_class_id: nftClassId,
          price_index: priceIndex,
        },
      })

      // Cache the result in itemsMap
      itemsMap.value.set(itemId, item)
      return true
    }
    catch (error) {
      if (
        error
        && typeof error === 'object'
        && 'statusCode' in error
        && error.statusCode === 404
      ) {
        return false
      }
      console.error('[book-list store] Failed to check book list item', error)
      throw error
    }
  }

  async function addItem(nftClassId: string, priceIndex: number) {
    const itemId = getBookListItemId(nftClassId, priceIndex)
    const existingItem = itemsMap.value.get(itemId)
    if (existingItem) return

    const item = await $fetch<BookListItem>('/api/book-list', {
      method: 'POST',
      body: {
        nftClassId,
        priceIndex,
      },
    })

    // Add to local state after successful API call
    itemsMap.value.set(itemId, item)
  }

  async function removeItem(nftClassId: string, priceIndex: number) {
    await $fetch('/api/book-list', {
      method: 'DELETE',
      body: {
        nftClassId,
        priceIndex,
      },
    })

    // Remove from local state after successful API call
    const itemId = getBookListItemId(nftClassId, priceIndex)
    itemsMap.value.delete(itemId)
  }

  function clearItems() {
    itemsMap.value.clear()
  }

  return {
    items,
    count,
    isLoading,

    addItem,
    removeItem,
    loadItems,
    clearItems,
    checkItemExists,
  }
})
