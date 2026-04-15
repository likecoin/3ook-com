import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

export interface AffiliatePublicConfig {
  active: boolean
  giftClassId?: string
  giftBookName?: string
  giftBookCover?: string
  giftOnTrial?: boolean
  affiliateClassIds: string[]
  customVoices: AffiliateVoiceData[]
}

export function getAffiliateVoicesForBook(
  config: AffiliatePublicConfig | null,
  nftClassId: string | undefined,
): AffiliateVoiceData[] {
  if (!config?.active || !nftClassId) return []
  if (!config.affiliateClassIds.includes(nftClassId.toLowerCase())) return []
  return config.customVoices
}

export function usePlusAffiliate() {
  const { user } = useUserSession()
  const affiliateFrom = computed(() => user.value?.plusAffiliateFrom)

  const state = useState<AffiliatePublicConfig | null>('plus-affiliate-config', () => null)
  // Track which affiliateFrom the cached state belongs to so a session
  // refresh that swaps the attribution triggers a refetch instead of
  // serving stale config.
  const loadedFor = useState<string | null>('plus-affiliate-loaded-for', () => null)
  const isLoading = useState<boolean>('plus-affiliate-loading', () => false)

  async function fetchConfig() {
    const from = affiliateFrom.value
    if (!from) {
      state.value = null
      loadedFor.value = null
      return
    }
    if (loadedFor.value === from || isLoading.value) return
    isLoading.value = true
    try {
      const data = await $fetch<AffiliatePublicConfig>(`/api/affiliate/${from}`)
      state.value = data?.active ? data : null
      loadedFor.value = from
    }
    catch (error) {
      console.error('[PlusAffiliate] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  function voicesForBook(nftClassId: MaybeRefOrGetter<string | undefined>): AffiliateVoiceData[] {
    return getAffiliateVoicesForBook(state.value, toValue(nftClassId))
  }

  return {
    config: state,
    affiliateFrom,
    fetchConfig,
    voicesForBook,
  }
}
