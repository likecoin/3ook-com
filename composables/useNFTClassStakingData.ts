import { formatUnits } from 'viem'
import type { ComputedRef } from 'vue'
import { LIKE_TOKEN_DECIMALS } from '~/shared/constants'

export function useNFTClassStakingData(nftClassId: ComputedRef<string>) {
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const toast = useToast()
  const { handleError } = useErrorHandler()
  const { t: $t } = useI18n()

  const {
    claimWalletRewardsOfNFTClass,
  } = useLikeStaking()

  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
  } = useLikeCollectiveContract()

  // State
  const totalStake = ref(0n)
  const userStake = ref(0n)
  const pendingRewards = ref(0n)
  const isClaimingRewards = ref(false)

  // Load staking data from blockchain
  async function loadStakingData() {
    try {
      totalStake.value = await getTotalStakeOfNFTClass(nftClassId.value)

      if (hasLoggedIn.value && user.value?.evmWallet) {
        const [userStakeAmount, pendingRewardsAmount] = await Promise.all([
          getWalletStakeOfNFTClass(user.value.evmWallet, nftClassId.value),
          getWalletPendingRewardsOfNFTClass(user.value.evmWallet, nftClassId.value),
        ])
        userStake.value = userStakeAmount
        pendingRewards.value = pendingRewardsAmount
      }
    }
    catch (error) {
      console.error('Failed to load staking data:', error)
    }
  }

  // Computed values for formatting
  const formattedTotalStake = computed(() => {
    return Number(formatUnits(totalStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedUserStake = computed(() => {
    return Number(formatUnits(userStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  const formattedPendingRewards = computed(() => {
    return Number(formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
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
        amount: formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS),
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

  // Reset data on logout
  watch(hasLoggedIn, (isLoggedIn) => {
    if (!isLoggedIn) {
      userStake.value = 0n
      pendingRewards.value = 0n
    }
  })

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
