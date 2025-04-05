interface LikerInfoResponseData {
  user: string
  displayName: string
  avatar: string
  cosmosWallet: string
  likeWallet: string
  description: string
}

interface LikerInfo {
  displayName: string
  avatarSrc: string
  cosmosWallet: string
  likeWallet: string
  description: string
}

export const useMetadataStore = defineStore('metadata', () => {
  const likerInfoByWalletAddressMap = ref<Record<string, LikerInfo>>({})

  const getLikerInfoByWalletAddress = computed(() => (walletAddress: string) => likerInfoByWalletAddressMap.value[walletAddress])

  const config = useRuntimeConfig()

  async function fetchLikerInfoByWalletAddress(walletAddress: string) {
    const res = await $fetch<LikerInfoResponseData>(`${config.public.likeCoinAPIEndpoint}/users/addr/${walletAddress}/min`)
    likerInfoByWalletAddressMap.value[walletAddress] = {
      displayName: res.displayName,
      avatarSrc: res.avatar,
      cosmosWallet: res.cosmosWallet,
      likeWallet: res.likeWallet,
      description: res.description,
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
