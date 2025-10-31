import { useBalance } from '@wagmi/vue'
import { formatUnits } from 'viem'

export function useLikeCoinBalance(walletAddress: MaybeRefOrGetter<string | undefined>) {
  const config = useRuntimeConfig()

  const { data } = useBalance({
    address: toValue(walletAddress) as `0x${string}`,
    token: config.public.likeCoinTokenAddress as `0x${string}`,
  })

  const likeBalance = computed(() => data.value?.value || 0n)

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
