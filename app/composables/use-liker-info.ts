import type { QueryClient } from '@tanstack/vue-query'
import { queryOptions, useQueries, useQuery } from '@tanstack/vue-query'

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

// The optional trailing segment keeps both shapes under one key type, so
// queryOptions still infers a concrete key (a union would not).
type LikerInfoByIdQueryKey = readonly [string, string, string, 'nocache'?]

export function getLikerInfoByIdQueryKey(likerId: string, nocache = false): LikerInfoByIdQueryKey {
  return nocache
    ? [LIKER_INFO_QUERY_KEY, 'id', likerId, 'nocache']
    : [LIKER_INFO_QUERY_KEY, 'id', likerId]
}

export function getLikerInfoByWalletAddressQueryKey(walletAddress: string) {
  return [LIKER_INFO_QUERY_KEY, 'wallet', walletAddress] as const
}

// Profiles are treated as immutable within a session: cache forever, never
// evict. The fetcher already retries via createRetryingFetch, so query-level
// retries would stack. Profiles are small flat objects, so shallow reactivity
// is safe and skips the per-observer deep proxy.
const sharedQueryOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
  refetchOnWindowFocus: false,
  shallow: true,
} as const

function createLikerInfoQueryFn(
  fetchData: () => Promise<LikerInfoResponseData>,
  getSeedKeys: (info: LikerInfo) => (readonly unknown[])[],
) {
  // Capture the Nuxt app now: queryFn runs outside Nuxt's ambient context on
  // the server. tryUseNuxtApp because disabled observers re-evaluate options in
  // watcher callbacks, where the instance may be unavailable on the server
  // (queryFn never runs while disabled, so the context is not needed there).
  const nuxtApp = tryUseNuxtApp()
  return async ({ client }: { client: QueryClient }) => {
    const data = await (nuxtApp ? nuxtApp.runWithContext(fetchData) : fetchData())
    const info = normalizeLikerInfoFromResponseData(data)
    // One profile answers lookups by both id and wallet; seed the sibling keys.
    for (const key of getSeedKeys(info)) {
      client.setQueryData(key, info)
    }
    return info
  }
}

export function getLikerInfoByIdQueryOptions({ likerId, nocache = false }: {
  likerId: string
  nocache?: boolean
}) {
  const canonicalKey = getLikerInfoByIdQueryKey(likerId)
  return queryOptions({
    ...sharedQueryOptions,
    // `?nocache=1` bypasses the upstream CDN, so it gets its own cache entry:
    // queryFn is per-query (last observer wins), and sharing the canonical key
    // would let the CDN-busting fetcher serve plain reads or vice versa. It
    // seeds the canonical key below, so every observer sees the fresh profile.
    queryKey: getLikerInfoByIdQueryKey(likerId, nocache),
    staleTime: nocache ? 0 : Infinity,
    queryFn: createLikerInfoQueryFn(
      () => fetchLikerPublicInfoById(likerId, { nocache }),
      info => [
        ...(nocache ? [canonicalKey] : []),
        ...(info.evmWallet ? [getLikerInfoByWalletAddressQueryKey(info.evmWallet)] : []),
      ],
    ),
  })
}

export function getLikerInfoByWalletAddressQueryOptions({ walletAddress }: {
  walletAddress: string
}) {
  return queryOptions({
    ...sharedQueryOptions,
    queryKey: getLikerInfoByWalletAddressQueryKey(walletAddress),
    queryFn: createLikerInfoQueryFn(
      () => fetchLikerPublicInfoByWalletAddress(walletAddress),
      info => (info.likerId ? [getLikerInfoByIdQueryKey(info.likerId)] : []),
    ),
  })
}

export function useLikerInfoByIdQuery(
  likerId: MaybeRefOrGetter<string | undefined>,
  { enabled = true, nocache = false }: LikerInfoQueryOptions & {
    nocache?: MaybeRefOrGetter<boolean>
  } = {},
) {
  return useQuery(computed(() => ({
    ...getLikerInfoByIdQueryOptions({
      likerId: toValue(likerId) || '',
      nocache: toValue(nocache),
    }),
    enabled: !!toValue(likerId) && toValue(enabled),
  })))
}

export function useLikerInfoByWalletAddressQuery(
  walletAddress: MaybeRefOrGetter<string | undefined>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  return useQuery(computed(() => ({
    ...getLikerInfoByWalletAddressQueryOptions({
      walletAddress: toValue(walletAddress) || '',
    }),
    enabled: !!toValue(walletAddress) && toValue(enabled),
  })))
}

export function useLikerInfosByIdsQuery(
  likerIds: MaybeRefOrGetter<string[]>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  return useQueries({
    queries: computed(() => toValue(likerIds).map(likerId => ({
      ...getLikerInfoByIdQueryOptions({ likerId }),
      enabled: !!likerId && toValue(enabled),
    }))),
  })
}

export function useLikerInfosByWalletAddressesQuery(
  walletAddresses: MaybeRefOrGetter<string[]>,
  { enabled = true }: LikerInfoQueryOptions = {},
) {
  return useQueries({
    queries: computed(() => toValue(walletAddresses).map(walletAddress => ({
      ...getLikerInfoByWalletAddressQueryOptions({ walletAddress }),
      enabled: !!walletAddress && toValue(enabled),
    }))),
  })
}
