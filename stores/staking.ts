import { formatUnits } from 'viem'

export interface StakingItem {
  nftClassId: string
  stakedAmount: bigint
  pendingRewards: bigint
  isOwned: boolean
}

interface UserStakingData {
  items: StakingItem[]
  totalUnclaimedRewards: bigint
  isFetching: boolean
  hasFetched: boolean
  ts?: number
}

interface NFTClassTotalStake {
  nftClassId: string
  totalStake: bigint
  isFetching: boolean
}

export const useStakingStore = defineStore('staking', () => {
  const { likeCoinTokenDecimals } = useRuntimeConfig().public
  const { loggedIn: hasLoggedIn } = useUserSession()
  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
  } = useLikeCollectiveContract()

  // State
  const stakingDataByWalletMap = ref<Record<string, UserStakingData>>({})
  const totalStakeByNFTClassMap = ref<Record<string, NFTClassTotalStake>>({})

  // Getters
  const getUserStakingData = computed(() => (walletAddress: string) => {
    return {
      items: stakingDataByWalletMap.value[walletAddress]?.items || [],
      totalUnclaimedRewards: stakingDataByWalletMap.value[walletAddress]?.totalUnclaimedRewards || 0n,
      isFetching: stakingDataByWalletMap.value[walletAddress]?.isFetching || false,
      hasFetched: stakingDataByWalletMap.value[walletAddress]?.hasFetched || false,
    }
  })

  const getFormattedTotalRewards = computed(() => (walletAddress: string) => {
    const totalRewards = stakingDataByWalletMap.value[walletAddress]?.totalUnclaimedRewards || 0n
    return Number(formatUnits(totalRewards, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  const getTotalStakeOfNFTClassCached = computed(() => (nftClassId: string) => {
    return totalStakeByNFTClassMap.value[nftClassId]?.totalStake ?? 0n
  })

  // Actions
  async function fetchUserStakingData(walletAddress: string) {
    if (stakingDataByWalletMap.value[walletAddress]?.isFetching) {
      return
    }

    if (!stakingDataByWalletMap.value[walletAddress]) {
      stakingDataByWalletMap.value[walletAddress] = {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
        ts: getTimestampRoundedToMinute(),
      }
    }

    try {
      stakingDataByWalletMap.value[walletAddress].isFetching = true

      const stakingData = new Map<string, StakingItem>()

      // Get books user has staked on from collective indexer
      try {
        const stakingsResponse = await fetchCollectiveAccountStakings(walletAddress, {
          'pagination.limit': 100,
        })

        for (const staking of stakingsResponse.data) {
          const nftClassId = staking.book_nft.toLowerCase()

          if (stakingData.has(nftClassId)) {
            continue
          }

          // Use data from indexer
          const stakedAmount = BigInt(staking.staked_amount)
          const pendingRewards = BigInt(staking.pending_reward_amount)

          // Only add if there's still an active stake or pending rewards
          if (stakedAmount > 0n || pendingRewards > 0n) {
            stakingData.set(nftClassId, {
              nftClassId,
              stakedAmount,
              pendingRewards,
              isOwned: false, // This will be updated in UI layer for owned books
            })
          }
        }
      }
      catch (error) {
        console.warn('Failed to fetch collective staking data:', error)
        // Continue with just owned books if collective API fails
      }

      // Convert to array and sort by staked amount descending
      const items = Array.from(stakingData.values()).sort((a, b) => {
        return Number(b.stakedAmount - a.stakedAmount)
      })

      if (items.length > 0) {
        stakingDataByWalletMap.value[walletAddress].items = items
      }

      stakingDataByWalletMap.value[walletAddress].totalUnclaimedRewards = stakingDataByWalletMap.value[walletAddress].items.reduce(
        (total, item) => total + item.pendingRewards,
        0n,
      )
      stakingDataByWalletMap.value[walletAddress].hasFetched = true
    }
    catch (error) {
      stakingDataByWalletMap.value[walletAddress].hasFetched = true
      throw error
    }
    finally {
      stakingDataByWalletMap.value[walletAddress].isFetching = false
    }
  }

  function clearUserStakingData(walletAddress: string) {
    if (stakingDataByWalletMap.value[walletAddress]) {
      stakingDataByWalletMap.value[walletAddress] = {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
    }
  }

  function updateStakingItem(walletAddress: string, nftClassId: string, updates: Partial<StakingItem>) {
    // Initialize user data if it doesn't exist
    if (!stakingDataByWalletMap.value[walletAddress]) {
      stakingDataByWalletMap.value[walletAddress] = {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
    }

    const userData = stakingDataByWalletMap.value[walletAddress]
    const itemIndex = userData.items.findIndex(item => item.nftClassId === nftClassId)

    // Initialize item if it doesn't exist
    if (itemIndex === -1) {
      userData.items.push({
        nftClassId,
        stakedAmount: 0n,
        pendingRewards: 0n,
        isOwned: false,
        ...updates,
      } as StakingItem)
    }
    else {
      userData.items[itemIndex] = { ...userData.items[itemIndex], ...updates } as StakingItem
    }

    // Recalculate total rewards
    userData.totalUnclaimedRewards = userData.items.reduce(
      (total, item) => total + item.pendingRewards,
      0n,
    )
  }

  async function fetchTotalStakeOfNFTClass(nftClassId: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    const cached = totalStakeByNFTClassMap.value[nftClassId]

    // Return cached value if available and not forcing refresh
    if (cached && !isRefresh && !cached.isFetching) {
      return cached.totalStake
    }

    // Avoid duplicate fetches
    if (cached?.isFetching) {
      return cached.totalStake
    }

    try {
      if (!totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId] = {
          nftClassId,
          totalStake: 0n,
          isFetching: false,
        }
      }

      totalStakeByNFTClassMap.value[nftClassId].isFetching = true

      const totalStake = await getTotalStakeOfNFTClass(nftClassId)
      if (totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId].totalStake = totalStake
      }

      return totalStake
    }
    finally {
      if (totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId].isFetching = false
      }
    }
  }

  async function fetchNFTClassStakingData(walletAddress: string, nftClassId: string) {
    const [stakedAmount, pendingRewards] = await Promise.all([
      getWalletStakeOfNFTClass(walletAddress, nftClassId),
      getWalletPendingRewardsOfNFTClass(walletAddress, nftClassId),
    ])

    const stakingItem = {
      nftClassId,
      stakedAmount,
      pendingRewards,
      isOwned: false,
    } as StakingItem

    updateStakingItem(walletAddress, nftClassId, stakingItem)

    return stakingItem
  }

  function reset() {
    stakingDataByWalletMap.value = {}
    totalStakeByNFTClassMap.value = {}
  }

  watch(hasLoggedIn, (value, oldValue) => {
    if (oldValue && !value) {
      reset()
    }
  })

  // Note: Stake mode is now auto-detected based on route

  return {
    stakingDataByWalletMap,
    totalStakeByNFTClassMap,

    getUserStakingData,
    getFormattedTotalRewards,
    getTotalStakeOfNFTClassCached,

    fetchUserStakingData,
    fetchTotalStakeOfNFTClass,
    fetchNFTClassStakingData,
    clearUserStakingData,
    updateStakingItem,
  }
})
