interface LikerInfo {
  displayName: string
  avatarSrc: string
  cosmosWallet: string
  likeWallet: string
  description: string
  isLikerPlus: boolean
}

export const useMetadataStore = defineStore('metadata', () => {
  const likerInfoByWalletAddressMap = ref<Record<string, LikerInfo>>({})

  const getLikerInfoByWalletAddress = computed(() => (walletAddress?: string) => walletAddress ? likerInfoByWalletAddressMap.value[walletAddress] : undefined)

  async function fetchLikerInfoByWalletAddress(walletAddress: string) {
    const res = await fetchLikerPublicInfoByWalletAddress(walletAddress)
    likerInfoByWalletAddressMap.value[walletAddress] = {
      displayName: res.displayName,
      avatarSrc: res.avatar,
      cosmosWallet: res.cosmosWallet,
      likeWallet: res.likeWallet,
      description: res.description,
      isLikerPlus: res.isLikerPlus || false,
    }
  }

  async function lazyFetchLikerInfoByWalletAddress(walletAddress: string) {
    if (getLikerInfoByWalletAddress.value(walletAddress)) return
    await fetchLikerInfoByWalletAddress(walletAddress)
  }

  return {
    likerInfoByWalletAddressMap,

    getLikerInfoByWalletAddress,

    fetchLikerInfoByWalletAddress,
    lazyFetchLikerInfoByWalletAddress,
  }
})
