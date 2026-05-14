interface LikerInfo {
  likerId?: string
  displayName?: string
  avatarSrc?: string
  cosmosWallet?: string
  likeWallet?: string
  evmWallet?: string
  description?: string
  isLikerPlus?: boolean
}

function normalizeLikerInfoFromResponseData(data?: LikerInfoResponseData): LikerInfo {
  return {
    likerId: data?.user,
    displayName: data?.displayName,
    avatarSrc: data?.avatar,
    cosmosWallet: data?.cosmosWallet,
    likeWallet: data?.likeWallet,
    evmWallet: data?.evmWallet,
    description: data?.description,
    isLikerPlus: data?.isLikerPlus || false,
  }
}

export const useMetadataStore = defineStore('metadata', () => {
  const likerInfoByIdMap = ref<Record<string, LikerInfo>>({})
  const likerIdByWalletAddressMap = ref<Record<string, string>>({})

  const getLikerInfoById = computed(() => (id?: string) => {
    if (!id) return undefined
    return likerInfoByIdMap.value[id]
  })

  const getLikerInfoByWalletAddress = computed(() => (walletAddress?: string) => {
    if (!walletAddress) return undefined
    const likerId = likerIdByWalletAddressMap.value[walletAddress]
    if (!likerId) return undefined
    return likerInfoByIdMap.value[likerId]
  })

  async function fetchLikerInfoById(likerId: string, options?: { nocache?: boolean }) {
    const data = await fetchLikerPublicInfoById(likerId, options)
    if (data.evmWallet) {
      likerIdByWalletAddressMap.value[data.evmWallet] = likerId
    }
    likerInfoByIdMap.value[likerId] = normalizeLikerInfoFromResponseData(data)
  }

  async function lazyFetchLikerInfoById(likerId: string, options?: { nocache?: boolean }) {
    if (getLikerInfoById.value(likerId) && !options?.nocache) return
    await fetchLikerInfoById(likerId, options)
  }

  async function fetchLikerInfoByWalletAddress(walletAddress: string) {
    const data = await fetchLikerPublicInfoByWalletAddress(walletAddress)
    const likerId = data.user
    likerIdByWalletAddressMap.value[walletAddress] = likerId
    likerInfoByIdMap.value[likerId] = normalizeLikerInfoFromResponseData(data)
  }

  async function lazyFetchLikerInfoByWalletAddress(walletAddress: string) {
    if (getLikerInfoByWalletAddress.value(walletAddress)) return
    await fetchLikerInfoByWalletAddress(walletAddress)
  }

  return {
    likerInfoByIdMap,
    likerIdByWalletAddressMap,

    getLikerInfoById,
    getLikerInfoByWalletAddress,

    fetchLikerInfoById,
    lazyFetchLikerInfoById,
    fetchLikerInfoByWalletAddress,
    lazyFetchLikerInfoByWalletAddress,
  }
})
