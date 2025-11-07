import { formatUnits } from 'viem'
import type { ComputedRef } from 'vue'

export function useNFTClassStakingData(nftClassId: ComputedRef<string>) {
  const { likeCoinTokenDecimals } = useRuntimeConfig().public
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const toast = useToast()
  const { handleError } = useErrorHandler()
  const { t: $t } = useI18n()

  const {
    claimWalletRewardsOfNFTClass,
  } = useLikeStaking()

  const stakingStore = useStakingStore()

  // State
  const isClaimingRewards = ref(false)

  // Computed user staking data from store
  const userStakingItem = computed(() => {
    if (!hasLoggedIn.value || !user.value?.evmWallet) return null

    const stakingData = stakingStore.getUserStakingData(user.value.evmWallet)
    return stakingData.items.find(item => item.nftClassId === nftClassId.value)
  })

  // State proxied from store data or fallback to zeros
  const userStake = computed(() => {
    return userStakingItem.value?.stakedAmount ?? 0n
  })

  const pendingRewards = computed(() => {
    return userStakingItem.value?.pendingRewards ?? 0n
  })

  const totalStake = computed(() => {
    return stakingStore.getTotalStakeOfNFTClassCached(nftClassId.value)
  })

  // Load staking data from blockchain
  async function loadStakingData() {
    try {
      // Load total stake for this NFT class
      await stakingStore.fetchTotalStakeOfNFTClass(nftClassId.value, {
        isRefresh: true,
      })

      // Load user staking data via store
      if (hasLoggedIn.value && user.value?.evmWallet) {
        await stakingStore.fetchNFTClassStakingData(
          user.value.evmWallet,
          nftClassId.value,
        )
      }
    }
    catch (error) {
      console.error('Failed to load staking data:', error)
    }
  }

  // Computed values for formatting
  const formattedTotalStake = computed(() => {
    return Number(formatUnits(totalStake.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedUserStake = computed(() => {
    return Number(formatUnits(userStake.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  const formattedPendingRewards = computed(() => {
    return Number(formatUnits(pendingRewards.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  const userStakePercentage = computed(() => {
    if (totalStake.value === 0n) return 0
    return Math.round((Number(userStake.value) / Number(totalStake.value)) * 10000) / 100
  })

  // Claim rewards
  async function handleClaimRewards() {
    try {
      isClaimingRewards.value = true

      await claimWalletRewardsOfNFTClass(user.value!.evmWallet, nftClassId.value)

      toast.add({
        title: $t('staking_claim_rewards_success'),
        color: 'success',
        icon: 'i-material-symbols-check-circle',
      })

      useLogEvent('claim_rewards_success', {
        nft_class_id: nftClassId.value,
        amount: formatUnits(pendingRewards.value, likeCoinTokenDecimals),
      })

      await loadStakingData()
    }
    catch (error) {
      await handleError(error, {
        title: $t('staking_claim_rewards_error'),
      })
    }
    finally {
      isClaimingRewards.value = false
    }
  }

  return {
    // State
    totalStake,
    userStake,
    pendingRewards,
    isClaimingRewards,
    // Computed
    formattedTotalStake,
    formattedUserStake,
    formattedPendingRewards,
    userStakePercentage,
    // Methods
    loadStakingData,
    handleClaimRewards,
  }
}
