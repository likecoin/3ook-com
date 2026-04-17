import type { AffiliatePublicConfig } from '~/shared/types/affiliate'
import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

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

  const loadedConfig = useState<AffiliatePublicConfig | null>('plus-affiliate-config', () => null)
  // Track which affiliateFrom the cached state belongs to so a session
  // refresh that swaps the attribution triggers a refetch instead of
  // serving stale config.
  const loadedFrom = useState<string | null>('plus-affiliate-loaded-from', () => null)
  const isLoading = useState<boolean>('plus-affiliate-loading', () => false)

  async function fetchConfig() {
    const from = affiliateFrom.value
    if (!from) {
      loadedConfig.value = null
      loadedFrom.value = null
      return
    }
    if (loadedFrom.value === from || isLoading.value) return
    isLoading.value = true
    try {
      const data = await $fetch<AffiliatePublicConfig>(`/api/affiliate/${encodeURIComponent(from)}`)
      loadedConfig.value = data?.active ? data : null
      loadedFrom.value = from
    }
    catch (error) {
      console.error('[PlusAffiliate] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  function voicesForBook(nftClassId: MaybeRefOrGetter<string | undefined>): AffiliateVoiceData[] {
    return getAffiliateVoicesForBook(loadedConfig.value, toValue(nftClassId))
  }

  return {
    config: loadedConfig,
    affiliateFrom,
    fetchConfig,
    voicesForBook,
  }
}
