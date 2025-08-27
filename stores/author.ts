interface OwnedClassMapType {
  classId: string
  title: string
}

export const useAuthorStore = defineStore('AuthorStore', () => {
  const nftClassesByOwner = ref<Record<string, NFTClass[]>>({})
  const isFetchingItems = ref<Record<string, boolean>>({})
  const hasFetchedItems = ref<Record<string, boolean>>({})

  async function lazyFetchNFTClassesByOwnerWallet(walletAddress: string): Promise<NFTClass[] | undefined> {
    try {
      if (nftClassesByOwner.value[walletAddress]) {
        return nftClassesByOwner.value[walletAddress]
      }
      if (isFetchingItems.value[walletAddress]) {
        return
      }

      isFetchingItems.value[walletAddress] = true
      const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, {})

      nftClassesByOwner.value[walletAddress] = result.data.map((item) => {
        return {
          ...item,
          address: item.address.toLowerCase() as `0x${string}`, // ensure address is lowercase
        }
      })
      hasFetchedItems.value[walletAddress] = true
      return nftClassesByOwner.value[walletAddress]
    }
    catch (error) {
      console.warn(`Failed to fetch owned items for ${walletAddress}:`, error)
      return undefined
    }
    finally {
      isFetchingItems.value[walletAddress] = false
    }
  }

  const getOwnedClass = computed(
    () =>
      (walletAddress: string): OwnedClassMapType[] => {
        const walletData = nftClassesByOwner.value[walletAddress]
        if (!walletData) {
          return []
        }

        return walletData
          .filter((nftClass: NFTClass) => {
            const metadata = nftClass.metadata
            return metadata?.['@type'] === 'Book'
          })
          .map((nftClass: NFTClass): OwnedClassMapType => ({
            classId: nftClass.address,
            title: nftClass.metadata?.name || nftClass.metadata?.title || '',
          }))
      },
  )

  return {
    nftClassesByOwner: readonly(nftClassesByOwner),
    isFetchingItemsByOwner: (walletAddress: string) => computed(() => isFetchingItems.value[walletAddress] || false),
    hasFetchedItemsByOwner: (walletAddress: string) => computed(() => hasFetchedItems.value[walletAddress] || false),

    getOwnedClass,

    lazyFetchOwnedClass: lazyFetchNFTClassesByOwnerWallet,
  }
})
