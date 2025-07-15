interface OwnedItemMapType {
  classId: string
  title: string
}

export const useOwnedItemStore = defineStore('ownedItemStore', () => {
  const ownedItemsByWalletMap = ref<Record<string, NFTClass[]>>({})
  const isFetchingItems = ref(false)
  const hasFetchedItems = ref(false)

  async function lazyFetchOwnedItems(walletAddress: string): Promise<NFTClass[] | undefined> {
    try {
      if (ownedItemsByWalletMap.value[walletAddress]) {
        return ownedItemsByWalletMap.value[walletAddress]
      }
      if (isFetchingItems.value) {
        return
      }

      isFetchingItems.value = true
      const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, {})

      ownedItemsByWalletMap.value[walletAddress] = result.data

      hasFetchedItems.value = true
      return ownedItemsByWalletMap.value[walletAddress]
    }
    catch (error) {
      console.warn(`Failed to fetch owned items for ${walletAddress}:`, error)
      return undefined
    }
    finally {
      isFetchingItems.value = false
    }
  }

  const getOwnedItems = computed(
    () =>
      (walletAddress: string): OwnedItemMapType[] => {
        const walletData = ownedItemsByWalletMap.value[walletAddress]
        if (!walletData) {
          return []
        }

        return walletData
          .filter((nftClass: NFTClass) => {
            const metadata = nftClass.metadata
            return metadata?.['@type'] === 'Book'
          })
          .map((nftClass: NFTClass): OwnedItemMapType => ({
            classId: nftClass.address,
            title: nftClass.metadata?.name || nftClass.metadata?.title || '',
          }))
      },
  )

  return {
    ownedItemsByWalletMap: readonly(ownedItemsByWalletMap),
    isFetchingItems: readonly(isFetchingItems),
    hasFetchedItems: readonly(hasFetchedItems),

    getOwnedItems,

    lazyFetchOwnedItems,
  }
})
