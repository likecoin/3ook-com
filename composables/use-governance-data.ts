import { formatUnits } from 'viem'
import { veLikeAddress } from '~/composables/use-ve-like-contract'

const SECONDS_PER_DAY = 86400n

export function useGovernanceData(walletAddress: string | Ref<string>) {
  const config = useRuntimeConfig()
  const { likeCoinTokenDecimals } = config.public
  const {
    balanceOf: getVeLikeBalance,
    totalSupply: getVeLikeTotalSupply,
    getCurrentRewardContract,
    convertToAssets,
    deposit,
    getLockTime: getContractLockTime,
  } = useVeLikeContract()
  const { approve: approveLikeCoin } = useLikeCoinContract()

  const rewardContractAddress = ref<string | null>(null)
  const {
    getClaimedReward,
    getPendingReward,
    getCurrentCondition,
  } = useVeLikeRewardContract(rewardContractAddress)

  const veLikeBalance = ref(0n)
  const likeStakedBalance = ref(0n)
  const pendingReward = ref(0n)
  const claimedReward = ref(0n)
  const lockTime = ref(0n)
  const currentCondition = ref<{
    startTime: bigint
    endTime: bigint
    rewardAmount: bigint
    rewardIndex: bigint
  } | null>(null)
  const totalSupplyValue = ref(0n)

  const formattedVeLikeBalance = computed(() => {
    return Number(formatUnits(veLikeBalance.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedLikeStakedBalance = computed(() => {
    return Number(formatUnits(likeStakedBalance.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedPendingReward = computed(() => {
    return Number(formatUnits(pendingReward.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const formattedClaimedReward = computed(() => {
    return Number(formatUnits(claimedReward.value, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const totalVotingPower = computed(() => {
    const total = veLikeBalance.value
    return Number(formatUnits(total, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  })

  const estimatedRewardPerDay = computed(() => {
    if (!currentCondition.value || veLikeBalance.value === 0n || totalSupplyValue.value === 0n) {
      return '0.00'
    }

    const { startTime, endTime, rewardAmount } = currentCondition.value

    // Avoid division by zero
    if (rewardAmount === 0n || endTime <= startTime) {
      return '0.00'
    }

    try {
      const timeDuration = endTime - startTime
      // Perform calculation with bigint, then convert to formatted string
      // timeUnit * balanceOf(account) * rewardAmount / totalSupply / (endTime - startTime)
      // timeUnit = 86400 (seconds per day)
      const numerator = SECONDS_PER_DAY * veLikeBalance.value * rewardAmount
      const denominator = totalSupplyValue.value * timeDuration * (BigInt(10) ** BigInt(likeCoinTokenDecimals))

      // Convert to number for formatting
      const estimatedValue = Number(numerator) / Number(denominator)

      return estimatedValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    }
    catch (err) {
      console.error('Error calculating estimated reward per day:', err)
      return '0.00'
    }
  })

  const isWithdrawLocked = computed(() => {
    if (lockTime.value === 0n) {
      return false
    }
    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    return lockTime.value > currentTime
  })

  const timeUntilWithdrawUnlock = computed(() => {
    if (!isWithdrawLocked.value) {
      return 0
    }
    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const secondsRemaining = Number(lockTime.value - currentTime)
    return secondsRemaining
  })

  async function loadGovernanceData() {
    if (!rewardContractAddress.value) {
      rewardContractAddress.value = await getCurrentRewardContract()
    }

    if (!toValue(walletAddress)) {
      return
    }

    const address = toValue(walletAddress) as `0x${string}`

    // Load all governance data in parallel
    const [veLikeBalanceResult, pendingRewardResult, claimedRewardResult, conditionResult, totalSupplyResult, lockTimeResult] = await Promise.all([
      getVeLikeBalance(address),
      getPendingReward(address).catch(() => 0n),
      getClaimedReward(address),
      getCurrentCondition(),
      getVeLikeTotalSupply(),
      getContractLockTime(),
    ])

    veLikeBalance.value = veLikeBalanceResult
    // Convert veLIKE shares to underlying LIKE amount
    const likeStakedAmount = await convertToAssets(veLikeBalanceResult)
    likeStakedBalance.value = likeStakedAmount
    pendingReward.value = pendingRewardResult
    claimedReward.value = claimedRewardResult
    currentCondition.value = conditionResult as {
      startTime: bigint
      endTime: bigint
      rewardAmount: bigint
      rewardIndex: bigint
    }
    totalSupplyValue.value = totalSupplyResult
    lockTime.value = lockTimeResult
  }

  async function approveAndDeposit(amount: bigint, receiver: string) {
    // Approve LIKE token for veLIKE contract
    await approveLikeCoin(veLikeAddress, amount)
    await deposit(amount, receiver)
  }

  // Load data when the composable is mounted
  watch(
    () => toValue(walletAddress),
    async (newAddress) => {
      if (newAddress) {
        await loadGovernanceData()
      }
    },
    { immediate: true },
  )

  return {
    // Raw values
    veLikeBalance,
    likeStakedBalance,
    pendingReward,
    claimedReward,
    lockTime,
    estimatedRewardPerDay: readonly(estimatedRewardPerDay),
    // Formatted values
    formattedVeLikeBalance,
    formattedLikeStakedBalance,
    formattedPendingReward,
    formattedClaimedReward,
    totalVotingPower,
    // Lock time status
    isWithdrawLocked: readonly(isWithdrawLocked),
    timeUntilWithdrawUnlock: readonly(timeUntilWithdrawUnlock),
    loadGovernanceData,
    approveAndDeposit,
  }
}
