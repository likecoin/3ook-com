interface OwnedClassMapType {
  classId: string
  title: string
}

export const useAuthorStore = defineStore('AuthorStore', () => {
  const ownedClassByWalletMap = ref<Record<string, NFTClass[]>>({})
  const isFetchingItems = ref(false)
  const hasFetchedItems = ref(false)

  async function lazyFetchOwnedClass(walletAddress: string): Promise<NFTClass[] | undefined> {
    try {
      if (ownedClassByWalletMap.value[walletAddress]) {
        return ownedClassByWalletMap.value[walletAddress]
      }
      if (isFetchingItems.value) {
        return
      }

      isFetchingItems.value = true
      const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, {})

      ownedClassByWalletMap.value[walletAddress] = result.data.map((item) => {
        return {
          ...item,
          address: item.address.toLowerCase() as `0x${string}`, // ensure address is lowercase
        }
      })
      hasFetchedItems.value = true
      return ownedClassByWalletMap.value[walletAddress]
    }
    catch (error) {
      console.warn(`Failed to fetch owned items for ${walletAddress}:`, error)
      return undefined
    }
    finally {
      isFetchingItems.value = false
    }
  }

  const getOwnedClass = computed(
    () =>
      (walletAddress: string): OwnedClassMapType[] => {
        const walletData = ownedClassByWalletMap.value[walletAddress]
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
    ownedClassByWalletMap: readonly(ownedClassByWalletMap),
    isFetchingItems: readonly(isFetchingItems),
    hasFetchedItems: readonly(hasFetchedItems),

    getOwnedClass,

    lazyFetchOwnedClass,
  }
})
