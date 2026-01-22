import { useReadContract } from '@wagmi/vue'
import { formatUnits, erc20Abi } from 'viem'

export function useLikeCoinBalance(walletAddress: MaybeRefOrGetter<string | undefined>) {
  const config = useRuntimeConfig()

  const args = computed((): [`0x${string}`] | undefined => {
    const address = toValue(walletAddress)
    return address ? [address as `0x${string}`] : undefined
  })

  const { data, refetch } = useReadContract({
    address: config.public.likeCoinTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: args,
    query: {
      enabled: computed(() => !!toValue(walletAddress)),
    },
  })

  const likeBalance = computed(() => data.value || 0n)

  const formattedLikeBalanceNumber = computed(() => {
    return Number(formatUnits(likeBalance.value, config.public.likeCoinTokenDecimals))
  })

  const formattedLikeBalance = computed(() => {
    return formattedLikeBalanceNumber.value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  })

  return {
    refetch,
    likeBalance,
    formattedLikeBalanceNumber,
    formattedLikeBalance,
  }
}
