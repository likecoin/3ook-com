import type { DefineQueryOptions, EntryKey, QueryCache } from '@pinia/colada'
import { useQuery } from '@pinia/colada'
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

const AFFILIATE_STORE_CONFIG_QUERY_KEY = 'affiliate-store-config'

// Keyed by a raw likerId from the route; array keys carry no
// prototype-pollution surface.
function getAffiliateStoreConfigQueryKey(likerId: string): EntryKey {
  return [AFFILIATE_STORE_CONFIG_QUERY_KEY, likerId]
}

function getAffiliateStoreConfigQueryOptions(likerId: string): DefineQueryOptions<AffiliatePublicConfig> {
  return {
    ...cacheForeverQueryOptions,
    key: getAffiliateStoreConfigQueryKey(likerId),
    // Always stale: every explicit fetch refetches (parity with the old
    // fetchAffiliateBooks), while concurrent calls dedupe on the shared entry.
    staleTime: 0,
    query: wrapQueryFnWithNuxtContext(() =>
      apiFetch<AffiliatePublicConfig>(`/affiliate/${encodeURIComponent(likerId)}`)),
  }
}

export async function fetchAffiliateStoreConfigThroughCache(
  queryCache: QueryCache,
  likerId: string,
): Promise<AffiliatePublicConfig | undefined> {
  return refreshQueryData(queryCache, getAffiliateStoreConfigQueryOptions(likerId))
}

export function getAffiliateStoreConfigByLikerIdFromCache(
  queryCache: QueryCache,
  likerId: string,
): AffiliatePublicConfig | null {
  return queryCache.getQueryData<AffiliatePublicConfig>(getAffiliateStoreConfigQueryKey(likerId)) ?? null
}

// One entry per Liker ID, so a navigation between storefronts never reads the other's config.
// Unlike the explicit fetches above, a reader reuses any cached entry: every card mounts one.
export function useAffiliateStoreConfigQuery(likerId: MaybeRefOrGetter<string>) {
  return useQuery(() => ({
    ...getAffiliateStoreConfigQueryOptions(toValue(likerId)),
    staleTime: Infinity,
    // Client-gated like the liker info queries: SSR fetches stay on the awaited helpers.
    enabled: import.meta.client && !!toValue(likerId),
  }))
}
