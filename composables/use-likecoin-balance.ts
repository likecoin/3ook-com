import { useReadContract } from '@wagmi/vue'
import { formatUnits, erc20Abi } from 'viem'

export function useLikeCoinBalance(walletAddress: MaybeRefOrGetter<string | undefined>) {
  const config = useRuntimeConfig()

  const { data } = useReadContract(
    {
      address: config.public.likeCoinTokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [toValue(walletAddress) as `0x${string}`],
      query: {
        enabled: computed(() => !!toValue(walletAddress)),
      },
    },
  )

  const likeBalance = computed(() => data.value || 0n)

  const formattedLikeBalance = computed(() => {
    return Number(formatUnits(likeBalance.value, config.public.likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  })

  return {
    likeBalance,
    formattedLikeBalance,
  }
}
