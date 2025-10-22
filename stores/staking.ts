import { formatUnits } from 'viem'
import { fetchCollectiveAccountStakings } from '~/shared/utils/collective-indexer'
import { LIKE_TOKEN_DECIMALS } from '~/shared/constants'

interface StakingItem {
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

export const useStakingStore = defineStore('staking', () => {
  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
  } = useLikeCollectiveContract()

  // State
  const stakingDataByWalletMap = ref<Record<string, UserStakingData>>({})

  // Auto-detect stake mode based on current route
  const route = useRoute()
  const isStakeMode = computed(() => {
    const routeName = route.name as string
    return routeName?.startsWith('stake') || routeName?.startsWith('collective')
  })

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
    return Number(formatUnits(totalRewards, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  // Actions
  async function fetchUserStakingData(walletAddress: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    if (stakingDataByWalletMap.value[walletAddress]?.isFetching) {
      return
    }

    if (!stakingDataByWalletMap.value[walletAddress] || isRefresh) {
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
      let totalRewards = 0n

      // Note: Owned books are now handled in the UI layer, not here

      // Get books user has staked on from collective indexer
      try {
        const stakingsResponse = await fetchCollectiveAccountStakings(walletAddress, {
          'pagination.limit': 100,
        })

        // Process stakings from indexer
        for (const staking of stakingsResponse.data) {
          const nftClassId = staking.book_nft

          // Skip if we already processed this book
          if (stakingData.has(nftClassId)) {
            continue
          }

          // Get current on-chain data for this staking
          const [stakedAmount, pendingRewards] = await Promise.all([
            getWalletStakeOfNFTClass(walletAddress, nftClassId),
            getWalletPendingRewardsOfNFTClass(walletAddress, nftClassId),
          ])

          // Only add if there's still an active stake or pending rewards
          if (stakedAmount > 0n || pendingRewards > 0n) {
            stakingData.set(nftClassId, {
              nftClassId,
              stakedAmount,
              pendingRewards,
              isOwned: false, // This will be updated in UI layer for owned books
            })
            totalRewards += pendingRewards
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

      stakingDataByWalletMap.value[walletAddress].items = items
      stakingDataByWalletMap.value[walletAddress].totalUnclaimedRewards = totalRewards
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
    const userData = stakingDataByWalletMap.value[walletAddress]
    if (!userData) return

    const itemIndex = userData.items.findIndex(item => item.nftClassId === nftClassId)
    if (itemIndex !== -1) {
      userData.items[itemIndex] = { ...userData.items[itemIndex], ...updates } as StakingItem

      // Recalculate total rewards
      userData.totalUnclaimedRewards = userData.items.reduce(
        (total, item) => total + item.pendingRewards,
        0n,
      )
    }
  }

  // Note: Stake mode is now auto-detected based on route

  return {
    stakingDataByWalletMap,
    isStakeMode,

    getUserStakingData,
    getFormattedTotalRewards,

    fetchUserStakingData,
    clearUserStakingData,
    updateStakingItem,
  }
})
