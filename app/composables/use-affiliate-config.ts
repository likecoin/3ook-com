import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

// Fetched for every visitor, not just Plus members: non-members are shown the
// member price too, which an opted-out affiliate link must hide.
export function useAffiliateConfig(affiliateId: MaybeRefOrGetter<string | undefined>) {
  const loadedConfig = useState<AffiliatePublicConfig | null>('affiliate-config', () => null)
  const loadedFrom = useState<string | null>('affiliate-config-loaded-from', () => null)
  const isLoading = useState<boolean>('affiliate-config-loading', () => false)

  function clearLoaded() {
    if (loadedConfig.value !== null) loadedConfig.value = null
    if (loadedFrom.value !== null) loadedFrom.value = null
  }

  async function fetchConfig() {
    const fromValue = toValue(affiliateId)
    const likerId = parseLikerIdHandle(fromValue)
    if (!fromValue || !likerId) {
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
      const config = await $fetch<AffiliatePublicConfig>(
        `/api/affiliate/${encodeURIComponent(likerId)}`,
      )
      // Re-check after await: discard if affiliateId changed.
      if (toValue(affiliateId) !== requestedFrom) return
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

  // Client only: an unawaited SSR fetch would serialize isLoading as true,
  // and the client watcher would then skip the fetch for good.
  if (import.meta.client) {
    watchImmediate(() => toValue(affiliateId), fetchConfig)
  }

  return {
    config: loadedConfig,
    fetchConfig,
  }
}
