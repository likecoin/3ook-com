import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

export function useAffiliateConfig(affiliateId: MaybeRefOrGetter<string | undefined>) {
  const { user } = useUserSession()

  const loadedConfig = useState<AffiliatePublicConfig | null>('affiliate-config', () => null)
  const loadedFrom = useState<string | null>('affiliate-config-loaded-from', () => null)
  const isLoading = useState<boolean>('affiliate-config-loading', () => false)

  function clearLoaded() {
    if (loadedConfig.value !== null) loadedConfig.value = null
    if (loadedFrom.value !== null) loadedFrom.value = null
  }

  async function fetchConfig() {
    const fromValue = toValue(affiliateId)
    if (!fromValue?.startsWith('@') || !user.value?.isLikerPlus) {
      clearLoaded()
      return
    }
    if (loadedFrom.value === fromValue || isLoading.value) return
    isLoading.value = true
    const requestedFrom = fromValue
    // Drop stale config from a previous affiliate so willPlusDiscountApply
    // doesn't compute using the wrong flag while the new fetch is in flight.
    clearLoaded()
    try {
      const likerId = normalizeLikerId(requestedFrom)
      const config = await $fetch<AffiliatePublicConfig>(
        `/api/affiliate/${encodeURIComponent(likerId)}`,
      )
      // Re-check after await: discard if affiliateId changed or user lost Plus.
      if (!user.value?.isLikerPlus || toValue(affiliateId) !== requestedFrom) return
      loadedConfig.value = config
      loadedFrom.value = requestedFrom
    }
    catch (error) {
      console.error('[AffiliateConfig] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
      // Catch up if affiliateId changed during the fetch (the watch's firing
      // was skipped by the isLoading guard).
      if (toValue(affiliateId) !== requestedFrom) {
        void fetchConfig()
      }
    }
  }

  watchImmediate(
    [() => toValue(affiliateId), () => user.value?.isLikerPlus],
    fetchConfig,
  )

  return {
    config: loadedConfig,
    fetchConfig,
  }
}
