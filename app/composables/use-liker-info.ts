import type { DefineQueryOptions, EntryKey, QueryCache } from '@pinia/colada'
import { useQuery, useQueryCache } from '@pinia/colada'

export const LIKER_INFO_QUERY_KEY = 'liker-info'

export interface LikerInfo {
  likerId?: string
  displayName?: string
  avatarSrc?: string
  cosmosWallet?: string
  likeWallet?: string
  evmWallet?: string
  description?: string
  isLikerPlus?: boolean
}

interface LikerInfoQueryOptions {
  // Gates fetching only; data already in the cache still renders. List contexts
  // pass their viewport flag so a long list doesn't fan out one profile request
  // per item on mount.
  enabled?: MaybeRefOrGetter<boolean>
}

export function normalizeLikerInfoFromResponseData(data?: LikerInfoResponseData): LikerInfo {
  return {
    likerId: data?.user,
    displayName: data?.displayName,
    avatarSrc: data?.avatar,
    cosmosWallet: data?.cosmosWallet,
    likeWallet: data?.likeWallet,
    evmWallet: data?.evmWallet,
    description: data?.description,
    isLikerPlus: data?.isLikerPlus || false,
  }
}

function getLikerInfoByIdQueryKey(likerId: string, nocache = false): EntryKey {
  return nocache
    ? [LIKER_INFO_QUERY_KEY, 'id', likerId, 'nocache']
    : [LIKER_INFO_QUERY_KEY, 'id', likerId]
}

function getLikerInfoByWalletAddressQueryKey(walletAddress: string): EntryKey {
  // Lowercase so checksummed and lowercased forms of the same EVM address
  // (e.g. API-returned evmWallet vs lowercased route params) share one entry.
  return [LIKER_INFO_QUERY_KEY, 'wallet', walletAddress.toLowerCase()]
}

// Profiles are treated as immutable within a session: never stale, and
// gcTime: false disables eviction. Pinia Colada has no query-level retries,
// which is what we want — the fetcher already retries via createRetryingFetch.
const sharedQueryOptions = {
  staleTime: Infinity,
  gcTime: false,
  refetchOnWindowFocus: false,
} as const

function createLikerInfoQueryFn(
  queryCache: QueryCache,
  fetchData: () => Promise<LikerInfoResponseData>,
  getSeedKeys: (info: LikerInfo) => EntryKey[],
) {
  // Capture the Nuxt app now: the query fn runs outside Nuxt's ambient context
  // on the server. tryUseNuxtApp because disabled queries re-evaluate options
  // in watcher callbacks, where the instance may be unavailable on the server
  // (the query fn never runs while disabled, so the context is not needed there).
  const nuxtApp = tryUseNuxtApp()
  return async () => {
    const data = await (nuxtApp ? nuxtApp.runWithContext(fetchData) : fetchData())
    const info = normalizeLikerInfoFromResponseData(data)
    // One profile answers lookups by both id and wallet; seed the sibling keys.
    // The query fn receives no cache handle, so the factory passes one in.
    for (const key of getSeedKeys(info)) {
      queryCache.setQueryData(key, info)
    }
    return info
  }
}

export function getLikerInfoByIdQueryOptions({ queryCache, likerId, nocache = false }: {
  queryCache: QueryCache
  likerId: string
  nocache?: boolean
}): DefineQueryOptions<LikerInfo> {
  const canonicalKey = getLikerInfoByIdQueryKey(likerId)
  return {
    ...sharedQueryOptions,
    // `?nocache=1` bypasses the upstream CDN, so it gets its own cache entry:
    // the query fn is per-entry (last caller wins), and sharing the canonical
    // key would let the CDN-busting fetcher serve plain reads or vice versa. It
    // seeds the canonical key below, so every observer sees the fresh profile.
    key: getLikerInfoByIdQueryKey(likerId, nocache),
    staleTime: nocache ? 0 : Infinity,
    query: createLikerInfoQueryFn(
      queryCache,
      () => fetchLikerPublicInfoById(likerId, { nocache }),
      info => [
        ...(nocache ? [canonicalKey] : []),
        ...(info.evmWallet ? [getLikerInfoByWalletAddressQueryKey(info.evmWallet)] : []),
      ],
    ),
  }
}

function getLikerInfoByWalletAddressQueryOptions({ queryCache, walletAddress }: {
  queryCache: QueryCache
  walletAddress: string
}): DefineQueryOptions<LikerInfo> {
  return {
    ...sharedQueryOptions,
    key: getLikerInfoByWalletAddressQueryKey(walletAddress),
    query: createLikerInfoQueryFn(
      queryCache,
      () => fetchLikerPublicInfoByWalletAddress(walletAddress),
      info => (info.likerId ? [getLikerInfoByIdQueryKey(info.likerId)] : []),
    ),
  }
}

// refresh() fetches only when stale and dedupes against any in-flight fetch;
// a failed fetch rejects with the original fetcher error (e.g. the FetchError
// 404 callers branch on).
async function refreshThroughCache(
  queryCache: QueryCache,
  options: DefineQueryOptions<LikerInfo>,
): Promise<LikerInfo | undefined> {
  const state = await queryCache.refresh(queryCache.ensure(options))
  return state.data
}

// queryCache is a parameter because call sites run in event handlers and async
// callbacks where the injection context is gone; callers capture
// useQueryCache() in setup.
export async function fetchLikerInfoByIdThroughCache(
  queryCache: QueryCache,
  likerId: string,
  { nocache = false }: { nocache?: boolean } = {},
): Promise<LikerInfo | undefined> {
  return refreshThroughCache(
    queryCache, getLikerInfoByIdQueryOptions({ queryCache, likerId, nocache }))
}

export async function fetchLikerInfoByWalletAddressThroughCache(
  queryCache: QueryCache,
  walletAddress: string,
): Promise<LikerInfo | undefined> {
  return refreshThroughCache(
    queryCache, getLikerInfoByWalletAddressQueryOptions({ queryCache, walletAddress }))
}

export function useLikerInfoByIdQuery(
  likerId: MaybeRefOrGetter<string | undefined>,
  { enabled = true, nocache = false }: LikerInfoQueryOptions & {
    nocache?: MaybeRefOrGetter<boolean>
  } = {},
) {
  const queryCache = useQueryCache()
  return useQuery(() => ({
    ...getLikerInfoByIdQueryOptions({
      queryCache,
      likerId: toValue(likerId) || '',
      nocache: toValue(nocache),
    }),
    // Client-gated: Pinia Colada auto-fetches enabled queries in
    // onServerPrefetch; SSR fetches stay on the explicit awaited paths
    // (refresh() call sites and the fetch*ThroughCache helpers).
    enabled: import.meta.client && !!toValue(likerId) && toValue(enabled),
  }))
}

export function useLikerInfoByWalletAddressQuery(
  walletAddress: MaybeRefOrGetter<string | undefined>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  const queryCache = useQueryCache()
  return useQuery(() => ({
    ...getLikerInfoByWalletAddressQueryOptions({
      queryCache,
      walletAddress: toValue(walletAddress) || '',
    }),
    enabled: import.meta.client && !!toValue(walletAddress) && toValue(enabled),
  }))
}

interface LikerInfoBatchQueryResult {
  data: LikerInfo | undefined
  isPending: boolean
}

// Pinia Colada has no useQueries, so batch lookups drive each cache entry
// imperatively: ensure() creates or reuses the entry and refresh() fetches
// only stale ones — staleTime Infinity means at most once per session — while
// deduping concurrent fetches on the shared entry.
function useLikerInfoBatchQuery(
  values: MaybeRefOrGetter<string[]>,
  { enabled = true, getOptions }: LikerInfoQueryOptions & {
    getOptions: (queryCache: QueryCache, value: string) => DefineQueryOptions<LikerInfo>
  },
): ComputedRef<LikerInfoBatchQueryResult[]> {
  const queryCache = useQueryCache()

  // watch, not watchEffect: refresh() reads entry state internally, which an
  // effect would track and re-run on every fetch settling. Client-gated to
  // keep list contexts off the SSR critical path, as with the single wrappers.
  watch(
    [() => toValue(values), () => toValue(enabled)] as const,
    ([currentValues, isEnabled]) => {
      if (import.meta.server || !isEnabled) return
      for (const value of currentValues) {
        if (!value) continue
        refreshThroughCache(queryCache, getOptions(queryCache, value)).catch(() => {
          // Failures live on the entry state; consumers render fallbacks.
        })
      }
    },
    { immediate: true },
  )

  // The query cache is reactive, so this recomputes as entries land —
  // including sibling-key seeds written by other fetches.
  return computed(() => toValue(values).map((value) => {
    const entry = value ? queryCache.get(getOptions(queryCache, value).key) : undefined
    return {
      data: entry?.state.value.data as LikerInfo | undefined,
      isPending: !entry || entry.state.value.status === 'pending',
    }
  }))
}

export function useLikerInfosByIdsQuery(
  likerIds: MaybeRefOrGetter<string[]>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  return useLikerInfoBatchQuery(likerIds, {
    enabled,
    getOptions: (queryCache, likerId) => getLikerInfoByIdQueryOptions({ queryCache, likerId }),
  })
}

export function useLikerInfosByWalletAddressesQuery(
  walletAddresses: MaybeRefOrGetter<string[]>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  return useLikerInfoBatchQuery(walletAddresses, {
    enabled,
    getOptions: (queryCache, walletAddress) =>
      getLikerInfoByWalletAddressQueryOptions({ queryCache, walletAddress }),
  })
}
