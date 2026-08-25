import type { DefineQueryOptions, EntryKey, QueryCache } from '@pinia/colada'

const NFT_CLASS_MESSAGES_QUERY_KEY = 'nft-class-messages'

function getNFTClassQueryKey(nftClassId: string): EntryKey {
  return [NFT_CLASS_QUERY_KEY, normalizeNFTClassId(nftClassId)]
}

function getBookstoreInfoQueryKey(nftClassId: string): EntryKey {
  return [BOOKSTORE_INFO_QUERY_KEY, normalizeNFTClassId(nftClassId)]
}

function getBookstorePendingReviewQueryKey(nftClassId: string): EntryKey {
  return [BOOKSTORE_PENDING_REVIEW_QUERY_KEY, normalizeNFTClassId(nftClassId)]
}

function getNFTClassMessagesQueryKey(nftClassId: string): EntryKey {
  return [NFT_CLASS_MESSAGES_QUERY_KEY, normalizeNFTClassId(nftClassId)]
}

/* Session-scoped SWR bookkeeping.

   Module-scoped instead of per-request state, so every mutation below is gated
   with import.meta.client: on the server this would leak freshness across
   requests, and background revalidation is pointless there anyway. Server
   reads then always see "unconfirmed", matching the old per-request store. */

// Class IDs whose class + bookstore metadata was confirmed against origin, not
// the CDN. Never persisted, so localStorage and SSR-hydrated caches start
// unconfirmed and drive the stale-while-revalidate path in ensure.
const revalidatedNFTClassIds = new Set<string>()
// Class IDs already tried this session, successfully or not. Caps the fan-out at
// one origin request per class, so a failing upstream can't be retried on every mount.
const attemptedRevalidationNFTClassIds = new Set<string>()
// In-flight background revalidations, coalesced by class ID. A bounded runner
// caps fan-out so a freshly-loaded grid of cached books doesn't fire one
// request per item at once.
const inflightRevalidations = new Map<string, Promise<unknown>>()
const queuedRevalidations: Array<() => void> = []
let activeRevalidationCount = 0
const MAX_CONCURRENT_REVALIDATIONS = 6
// Reactive count of class IDs with a queued or in-flight background revalidation.
// Drives a loading signal for views (the library tab) whose filter hides items
// until their authoritative metadata lands.
const revalidatingCount = ref(0)

function getIsNFTClassMetadataFresh(nftClassId: string) {
  return revalidatedNFTClassIds.has(normalizeNFTClassId(nftClassId))
}

export function useIsRevalidatingNFTClassMetadata() {
  return computed(() => revalidatingCount.value > 0)
}

/* Reactive cache lookups.

   getQueryData is reactive inside computeds: it reads the cache's shallowRef
   (entry creation/removal triggers it) and the entry's state shallowRef (data
   updates trigger it), so these behave like the former Pinia map getters. */

export function getNFTClassByIdFromCache(
  queryCache: QueryCache,
  nftClassId: string,
): Partial<NFTClass> | undefined {
  return queryCache.getQueryData<Partial<NFTClass>>(getNFTClassQueryKey(nftClassId))
}

export function getNFTClassMetadataByIdFromCache(queryCache: QueryCache, nftClassId: string) {
  return getNFTClassByIdFromCache(queryCache, nftClassId)?.metadata
}

export function getBookstoreInfoByNFTClassIdFromCache(
  queryCache: QueryCache,
  nftClassId: string,
): BookstoreInfo | null | undefined {
  return queryCache.getQueryData<BookstoreInfo | null>(getBookstoreInfoQueryKey(nftClassId))
}

export function getIsBookstorePendingReviewFromCache(
  queryCache: QueryCache,
  nftClassId: string,
): boolean | undefined {
  return queryCache.getQueryData<boolean>(getBookstorePendingReviewQueryKey(nftClassId))
}

export function getNFTClassMessagesFromCache(
  queryCache: QueryCache,
  nftClassId: string,
): NFTBuyerMessage[] | undefined {
  return queryCache.getQueryData<NFTBuyerMessage[]>(getNFTClassMessagesQueryKey(nftClassId))
}

/* Cache writers.

   nft-class and bookstore-info are seed-only entries (created via setQueryData,
   no per-entry query fn): the aggregated endpoint spans both entries with
   include/exclude, which doesn't fit Colada's one-query-fn-per-entry model.
   Entries without options are never garbage-collected, matching the former
   never-evicting Pinia maps.

   Both writers skip identity-changing no-op writes: a background revalidation
   usually returns unchanged data, and a fresh object identity would re-render
   every consumer and re-persist the cache for nothing. */

export function setNFTClassData(
  queryCache: QueryCache,
  nftClassId: string,
  nftClass: Partial<NFTClass>,
) {
  const normalizedNFTClassId = normalizeNFTClassId(nftClassId)
  const key = getNFTClassQueryKey(normalizedNFTClassId)
  const oldData = queryCache.getQueryData<Partial<NFTClass>>(key)
  const newData = {
    ...oldData,
    ...nftClass,
    address: normalizedNFTClassId,
  }
  if (oldData && JSON.stringify(oldData) === JSON.stringify(newData)) return
  queryCache.setQueryData(key, newData)
}

export function setBookstoreInfo(
  queryCache: QueryCache,
  nftClassId: string,
  bookstoreInfo: BookstoreInfo | null,
) {
  const key = getBookstoreInfoQueryKey(nftClassId)
  const oldData = queryCache.getQueryData<BookstoreInfo | null>(key)
  if (oldData !== undefined && JSON.stringify(oldData) === JSON.stringify(bookstoreInfo)) return
  queryCache.setQueryData<BookstoreInfo | null>(key, () => bookstoreInfo)
}

export function setBookstorePendingReview(
  queryCache: QueryCache,
  nftClassId: string,
  isPendingReview: boolean,
) {
  const key = getBookstorePendingReviewQueryKey(nftClassId)
  const oldData = queryCache.getQueryData<boolean>(key)
  if (oldData === isPendingReview) return
  // Not-pending is the default, and these seed-only entries are never evicted:
  // only ever materialise one to carry, or to clear, a pending flag.
  if (!isPendingReview && oldData === undefined) return
  queryCache.setQueryData<boolean>(key, () => isPendingReview)
}

export async function fetchNFTClassAggregatedMetadataThroughCache(
  queryCache: QueryCache,
  nftClassId: string,
  options?: FetchLikeCoinNFTClassAggregatedMetadataOptions,
) {
  const data = await fetchCachedLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
  if (data.classData) {
    setNFTClassData(queryCache, nftClassId, { metadata: data.classData as NFTClassMetadata })
  }
  if (data.bookstoreInfo !== undefined) {
    setBookstoreInfo(queryCache, nftClassId, data.bookstoreInfo)
  }
  if (data.isBookstorePendingReview !== undefined) {
    setBookstorePendingReview(queryCache, nftClassId, data.isBookstorePendingReview)
  }
  // Key off the requested options, not payload truthiness — a null classData is
  // a legitimate answer. nocache is required: a plain response may be the CDN's
  // day-old stale-while-revalidate body, so it cannot confirm liveness.
  const requestedOptions = resolveLikeCoinNFTMetadataDataOptions(options)
  const hasConfirmedLiveMetadata = !!options?.nocache
    && requestedOptions.includes('class_chain')
    && requestedOptions.includes('bookstore')
  if (hasConfirmedLiveMetadata && import.meta.client) {
    revalidatedNFTClassIds.add(normalizeNFTClassId(nftClassId))
  }
  return data
}

function runNextRevalidation() {
  if (activeRevalidationCount >= MAX_CONCURRENT_REVALIDATIONS) return
  const next = queuedRevalidations.shift()
  if (!next) return
  activeRevalidationCount += 1
  next()
}

// Background revalidation: coalesced, bounded fan-out. nocache is required —
// the LikeCoin CDN serves a 24h stale-while-revalidate body, so a plain refetch
// loops on the stale value and never heals a corrected field. Keeps cache on failure.
function revalidateNFTClassAggregatedMetadataById(queryCache: QueryCache, nftClassId: string) {
  if (import.meta.server) return Promise.resolve()
  const key = normalizeNFTClassId(nftClassId)
  const existing = inflightRevalidations.get(key)
  if (existing) return existing
  // A failed attempt leaves the class unconfirmed, so without this every later
  // mount would refire an origin-hitting request while the upstream stays down.
  if (attemptedRevalidationNFTClassIds.has(key)) return Promise.resolve()
  attemptedRevalidationNFTClassIds.add(key)
  revalidatingCount.value += 1
  const promise = new Promise<void>((resolve) => {
    queuedRevalidations.push(() => {
      fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId, { include: ['class_chain', 'bookstore'], nocache: true })
        .catch(() => { /* keep the cached value; retry on a later session */ })
        .finally(() => {
          activeRevalidationCount -= 1
          inflightRevalidations.delete(key)
          revalidatingCount.value -= 1
          resolve()
          runNextRevalidation()
        })
    })
    runNextRevalidation()
  })
  inflightRevalidations.set(key, promise)
  return promise
}

// Proactively revalidates a batch of not-yet-fresh class IDs, fire-and-forget.
// The library's staking tab filters its candidates out before they render, so
// they never trigger their own SWR refresh — nudging them here lets the gate
// reactively re-filter as authoritative flags land.
export function revalidateNFTClassAggregatedMetadata(queryCache: QueryCache, nftClassIds: string[]) {
  if (import.meta.server) return
  const pendingIds = [...new Set(nftClassIds.map(id => normalizeNFTClassId(id)).filter(Boolean))]
    .filter(id => !getIsNFTClassMetadataFresh(id))
  pendingIds.forEach(id => revalidateNFTClassAggregatedMetadataById(queryCache, id))
}

export async function ensureNFTClassAggregatedMetadataThroughCache(
  queryCache: QueryCache,
  nftClassId: string,
  { exclude = [], nocache = false }: FetchLikeCoinNFTClassAggregatedMetadataOptions = {},
) {
  const excludedOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[] = [...exclude]
  const cachedClassChain = nocache ? undefined : getNFTClassMetadataByIdFromCache(queryCache, nftClassId)
  const cachedBookstore = nocache ? undefined : getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
  if (cachedClassChain) {
    excludedOptions.push('class_chain')
  }
  if (cachedBookstore) {
    excludedOptions.push('bookstore')
  }
  if (cachedClassChain && cachedBookstore) {
    // Stale-while-revalidate: serve the cached value now, but if it hasn't
    // been confirmed live this session (e.g. hydrated from localStorage),
    // refresh it once in the background so the persisted cache self-heals.
    if (!nocache && !getIsNFTClassMetadataFresh(nftClassId)) {
      revalidateNFTClassAggregatedMetadataById(queryCache, nftClassId)
    }
    return {
      classData: cachedClassChain,
      bookstoreInfo: cachedBookstore,
      ownerInfo: null,
    }
  }
  return fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId, { exclude: excludedOptions, nocache })
}

/* Purchase messages: a regular per-entry query. */

function getNFTClassMessagesQueryOptions(nftClassId: string): DefineQueryOptions<NFTBuyerMessage[]> {
  return {
    ...cacheForeverQueryOptions,
    key: getNFTClassMessagesQueryKey(nftClassId),
    query: wrapQueryFnWithNuxtContext(async () => {
      try {
        const data = await fetchPurchaseMessagesByNFTClassId(nftClassId)
        return data.messages
      }
      catch (error) {
        // A 404 is this book's terminal answer: it has no buyer messages. Cache
        // that as empty rather than rejecting. Transient failures still throw —
        // these options never expire, so an empty result would stick all session.
        if (getErrorStatusCode(error) === 404) return []
        throw error
      }
    }),
  }
}

export async function fetchNFTClassMessagesThroughCache(
  queryCache: QueryCache,
  nftClassId: string,
): Promise<NFTBuyerMessage[] | undefined> {
  return refreshQueryData(queryCache, getNFTClassMessagesQueryOptions(nftClassId))
}
