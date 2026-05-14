export const useAuthorStore = defineStore('AuthorStore', () => {
  const nftBookClassIdsByOwner = ref<Record<string, string[]>>({})
  const isFetchingItems = ref<Record<string, boolean>>({})
  const hasFetchedItems = ref<Record<string, boolean>>({})
  const nftStore = useNFTStore()

  async function lazyFetchBookClassByOwnerWallet(walletAddress: string): Promise<string[] | undefined> {
    try {
      if (nftBookClassIdsByOwner.value[walletAddress]) {
        return nftBookClassIdsByOwner.value[walletAddress]
      }
      if (isFetchingItems.value[walletAddress]) {
        return
      }

      isFetchingItems.value[walletAddress] = true
      const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, {})

      const filteredBooks = result.data.filter((nftClass: NFTClass) => {
        const metadata = nftClass.metadata
        return metadata?.['@type'] === 'Book'
      })

      // Save NFTClass data to NFT store for metadata access
      nftStore.addNFTClasses(filteredBooks)

      nftBookClassIdsByOwner.value[walletAddress] = filteredBooks.map((item) => {
        return item.address.toLowerCase() as `0x${string}` // ensure address is lowercase
      })
      hasFetchedItems.value[walletAddress] = true
      return nftBookClassIdsByOwner.value[walletAddress]
    }
    catch (error) {
      console.warn(`Failed to fetch owned items for ${walletAddress}:`, error)
      return
    }
    finally {
      isFetchingItems.value[walletAddress] = false
    }
  }

  const getOwnedBookClassIds = computed(
    () =>
      (walletAddress: string): string[] => {
        const walletData = nftBookClassIdsByOwner.value[walletAddress]
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
