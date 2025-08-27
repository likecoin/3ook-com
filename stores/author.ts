export const useAuthorStore = defineStore('AuthorStore', () => {
  const nftBookClassesByOwner = ref<Record<string, string[]>>({})
  const isFetchingItems = ref<Record<string, boolean>>({})
  const hasFetchedItems = ref<Record<string, boolean>>({})

  async function lazyFetchBookClassByOwnerWallet(walletAddress: string): Promise<string[] | undefined> {
    try {
      if (nftBookClassesByOwner.value[walletAddress]) {
        return nftBookClassesByOwner.value[walletAddress]
      }
      if (isFetchingItems.value[walletAddress]) {
        return
      }

      isFetchingItems.value[walletAddress] = true
      const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, {})

      nftBookClassesByOwner.value[walletAddress] = result.data
        .filter((nftClass: NFTClass) => {
          const metadata = nftClass.metadata
          return metadata?.['@type'] === 'Book'
        })
        .map((item) => {
          return item.address.toLowerCase() as `0x${string}` // ensure address is lowercase
        })
      hasFetchedItems.value[walletAddress] = true
      return nftBookClassesByOwner.value[walletAddress]
    }
    catch (error) {
      console.warn(`Failed to fetch owned items for ${walletAddress}:`, error)
      return undefined
    }
    finally {
      isFetchingItems.value[walletAddress] = false
    }
  }

  const getOwnedBookClassIds = computed(
    () =>
      (walletAddress: string): string[] => {
        const walletData = nftBookClassesByOwner.value[walletAddress]
        if (!walletData) {
          return []
        }
        return walletData
      },
  )

  return {
    isFetchingItemsByOwner: (walletAddress: string) => computed(() => isFetchingItems.value[walletAddress] || false),
    hasFetchedItemsByOwner: (walletAddress: string) => computed(() => hasFetchedItems.value[walletAddress] || false),

    getOwnedBookClassIds,

    lazyFetchBookClassByOwnerWallet,
  }
})
