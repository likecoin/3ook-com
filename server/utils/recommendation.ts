import { createHash } from 'node:crypto'

import { Timestamp } from 'firebase-admin/firestore'
import { FetchError } from 'ofetch'

import type {
  PortraitBookEntry,
  PortraitBookMetadata,
  RecommendationCandidate,
  UserAffinityPortrait,
} from '~~/shared/utils/recommendation'
import {
  FOR_YOU_MIN_SIGNAL_BOOKS,
  applyDiversityGuard,
  derivePortraitFromDocs,
  filterMeaningfulKeywords,
  getCandidateClassId,
  getIsSignalBook,
  getTopAffinityKeys,
  scoreCandidates,
} from '~~/shared/utils/recommendation'
import { getBookEntityName, getBookstoreScopedKey } from '~~/shared/utils/bookstore'
import { fetchTokenBookNFTsByAccount, getIndexerNextKey } from '~~/shared/utils/indexer'

export const FOR_YOU_DEFAULT_PAGE_SIZE = 40
// Seeded results are computed and cached at one fixed size regardless of the
// requested limit, so the product page and read-next modal share one entry.
const FOR_YOU_SEEDED_PAGE_SIZE = 10

const PORTRAIT_BOOKS_LIMIT = 30
const PORTRAIT_WISHLIST_LIMIT = 20
const PORTRAIT_METADATA_CONCURRENCY = 10

const CANDIDATE_GENRE_POOL_COUNT = 3
const CANDIDATE_AUTHOR_POOL_COUNT = 2
const CANDIDATE_KEYWORD_POOL_COUNT = 2
// The seed's own keywords are unweighted, so take only the first as a pool.
const SEED_KEYWORD_POOL_COUNT = 1
const GENRE_POOL_PAGE_SIZE = 100
const SEARCH_POOL_PAGE_SIZE = 50
const PRIOR_POOL_PAGE_SIZE = 100

// Shelf exclusion. The portrait's engagedClassIds only spans its own 30-book
// window, so answering "is this already on the shelf?" needs its own lookup.
const SHELF_BOOKS_LIMIT = 1000
const OWNED_BOOKS_PAGE_SIZE = 100
const OWNED_BOOKS_MAX_PAGES = 5
// Wall-clock bound on the drain below: every page carries its own retries and
// timeout, so a degraded indexer would otherwise stall the whole compute.
const OWNED_BOOKS_DRAIN_TIMEOUT_MS = 5000

const FEED_CACHE_TTL_MS = 15 * 60 * 1000
// Single staleness authority for both portrait cache tiers — the in-memory
// maxAge derives from it, so the L1 can't outlive the durable layer.
const PORTRAIT_CACHE_TTL_MS = 60 * 60 * 1000
const PORTRAIT_CACHE_DOC_ID = 'for-you-portrait'
// Bump whenever UserAffinityPortrait gains or renames a field: cached payloads
// are rehydrated straight into the scorer, so an older shape must count as a miss.
const PORTRAIT_CACHE_VERSION = 1

export interface ForYouFetchOptions {
  isLibrary?: boolean
  seed?: string
  limit?: number
}

// Derived from the served ids rather than assigned per request, so a cache hit
// and the recompute that replaces it share an id when the ranking didn't move —
// which is what makes a click joinable to the impression that produced it.
function getFeedId(records: BookstoreCMSProduct[]): string {
  return createHash('sha256')
    .update(records.map(getCandidateClassId).join(','))
    .digest('hex')
    .slice(0, 12)
}

function buildFeedResponse(
  records: BookstoreCMSProduct[],
  isPersonalized: boolean,
  limit: number,
): FetchBookstoreForYouResponseData {
  // Strip after ranking: scoring needs the metadata, the client does not.
  const servedRecords = records.slice(0, limit)
  const { records: strippedRecords } = stripRecommendationMetadata({ records: servedRecords })
  return {
    records: strippedRecords,
    hasMore: false,
    isPersonalized,
    feedId: getFeedId(servedRecords),
  }
}

function normalizePortraitMetadata(info: BookstoreInfo): PortraitBookMetadata {
  return {
    genre: info.genre,
    authorName: getBookEntityName(info.author),
    keywords: info.keywords,
    inLanguage: info.inLanguage,
    recommendedClassIds: info.recommendedClassIds,
  }
}

async function fetchPortraitMetadataByClassIds(
  nftClassIds: string[],
): Promise<Record<string, PortraitBookMetadata>> {
  const result: Record<string, PortraitBookMetadata> = {}
  // Sliding concurrency pool (not chunked barriers) so one slow fetch doesn't
  // gate the next batch; a failed fetch just skips that book's affinity.
  let cursor = 0
  async function runWorker() {
    while (cursor < nftClassIds.length) {
      const nftClassId = nftClassIds[cursor++] as string
      try {
        const { bookstoreInfo } = await fetchCachedNFTClassAggregatedMetadata(nftClassId, ['bookstore'])
        if (bookstoreInfo) result[nftClassId.toLowerCase()] = normalizePortraitMetadata(bookstoreInfo)
      }
      catch {
        // Skip this book's affinity on failure.
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(PORTRAIT_METADATA_CONCURRENCY, nftClassIds.length) }, runWorker),
  )
  return result
}

async function buildUserPortrait(wallet: string): Promise<UserAffinityPortrait> {
  const [booksSnapshot, bookListItems] = await Promise.all([
    getUserCollection().doc(wallet).collection('books')
      .orderBy('updatedAt', 'desc')
      .limit(PORTRAIT_BOOKS_LIMIT)
      .get(),
    fetchUserBookList(wallet, { limit: PORTRAIT_WISHLIST_LIMIT }),
  ])

  const bookEntries: PortraitBookEntry[] = booksSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      nftClassId: doc.id,
      totalReadingTimeMs: data.totalReadingTimeMs,
      totalTTSListeningTimeMs: data.totalTTSListeningTimeMs,
      completedAtMs: timestampToMillis(data.completedAt),
      didNotFinishAtMs: timestampToMillis(data.didNotFinishAt),
      plusBorrowedAtMs: timestampToMillis(data.plusBorrowedAt),
      lastOpenedTimeMs: timestampToMillis(data.lastOpenedTime),
      updatedAtMs: timestampToMillis(data.updatedAt),
    }
  })
  // Book list items are keyed by class id + price index, so the same book can
  // appear more than once — dedupe or its affinity gets counted twice.
  const wishlistClassIds = [...new Set(bookListItems.map(item => item.nftClassId.toLowerCase()))]

  // The gate is settled by the docs alone — the metadata fan-out below feeds
  // affinity, which a cold-start feed never reads. Fetching it first would buy
  // ~50 upstream calls to answer a question already answered.
  const engagedClassIds = bookEntries.map(entry => entry.nftClassId.toLowerCase())
  const signalBookCount = bookEntries.filter(getIsSignalBook).length + wishlistClassIds.length
  if (signalBookCount < FOR_YOU_MIN_SIGNAL_BOOKS) {
    return {
      genres: {},
      authors: {},
      keywords: {},
      languages: {},
      engagedClassIds,
      wishlistClassIds,
      recommendedClassIds: [],
      signalBookCount,
    }
  }

  const metadataClassIds = [...new Set([...engagedClassIds, ...wishlistClassIds])]
  const metadataByClassId = await fetchPortraitMetadataByClassIds(metadataClassIds)

  return derivePortraitFromDocs(bookEntries, wishlistClassIds, metadataByClassId, Date.now())
}

function getUserCacheDocRef(wallet: string, docId: string) {
  return getUserCollection().doc(wallet).collection('cache').doc(docId)
}

interface PortraitCacheDocData {
  // Stored as a JSON string, not a Firestore map: the affinity keys are Airtable
  // genres/authors/keywords, which as map keys become field names and would then
  // be subject to Firestore's reserved-name rules.
  portrait: string
  version: number
  computedAt: Timestamp
}

async function readPortraitCache(wallet: string): Promise<UserAffinityPortrait | undefined> {
  try {
    const cached = (await getUserCacheDocRef(wallet, PORTRAIT_CACHE_DOC_ID).get())
      .data() as PortraitCacheDocData | undefined
    if (!cached || cached.version !== PORTRAIT_CACHE_VERSION) return undefined
    if (Date.now() - cached.computedAt.toMillis() >= PORTRAIT_CACHE_TTL_MS) return undefined
    return JSON.parse(cached.portrait) as UserAffinityPortrait
  }
  catch (error) {
    console.warn('[for-you] Failed to read portrait cache:', error)
    return undefined
  }
}

async function fetchDurableUserPortrait(wallet: string): Promise<UserAffinityPortrait> {
  const cached = await readPortraitCache(wallet)
  if (cached) return cached

  const portrait = await buildUserPortrait(wallet)
  // Cold-start portraits gate the personalized/popular switch, so persisting one
  // would pin a user who just crossed the threshold to the popular feed for a
  // whole TTL. They are also the cheapest to rebuild.
  if (portrait.signalBookCount >= FOR_YOU_MIN_SIGNAL_BOOKS) {
    // Fire-and-forget; a failed write only costs the next request a rebuild.
    getUserCacheDocRef(wallet, PORTRAIT_CACHE_DOC_ID).set({
      portrait: JSON.stringify(portrait),
      version: PORTRAIT_CACHE_VERSION,
      computedAt: Timestamp.now(),
    }).catch((error) => {
      console.warn('[for-you] Failed to write portrait cache:', error)
    })
  }
  return portrait
}

// Two tiers: this per-instance cache flushes on deploy/scale-out, so the durable
// read-through above is what spares a cold instance the portrait's ~50 metadata
// fetches. A warm hit here never touches Firestore.
const fetchUserPortrait = defineCachedFunction(fetchDurableUserPortrait, {
  name: 'for-you-portrait',
  group: 'store',
  swr: true,
  maxAge: PORTRAIT_CACHE_TTL_MS / 1000,
  getKey: (wallet: string) => wallet.toLowerCase(),
})

// Every book the wallet has opened, borrowed or marked. Ordered like the
// portrait query so an over-cap shelf keeps its most recent books rather than an
// arbitrary slice; select() with no fields skips deserializing the rest.
async function fetchEngagedBookClassIds(wallet: string): Promise<string[]> {
  const snapshot = await getUserCollection().doc(wallet).collection('books')
    .select()
    .orderBy('updatedAt', 'desc')
    .limit(SHELF_BOOKS_LIMIT)
    .get()
  return snapshot.docs.map(doc => doc.id.toLowerCase())
}

// Resolves undefined once the budget runs out. The indexer fetch re-arms its own
// per-attempt abort signal, so an external one gets clobbered — racing the
// deadline is what actually bounds it. The abandoned request settles on its own;
// its rejection is swallowed so a dropped page can't surface as unhandled.
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  promise.catch(() => {})
  let timer: ReturnType<typeof setTimeout> | undefined
  const expiry = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms)
  })
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer))
}

// Owning a book writes no Firestore doc until it is opened, so ownership has to
// come from the indexer — this is the half of the shelf the portrait can't see.
// Pages arrive newest-acquired first, so a capped drain drops the coldest tail.
async function fetchOwnedBookClassIds(wallet: string): Promise<string[]> {
  const classIds: string[] = []
  const deadline = Date.now() + OWNED_BOOKS_DRAIN_TIMEOUT_MS
  let key: string | undefined
  try {
    for (let page = 0; page < OWNED_BOOKS_MAX_PAGES; page += 1) {
      // Checked before each page, not after: one wedged page would otherwise run
      // to the indexer's own 30s x 3 policy and blow this budget many times over.
      const remaining = deadline - Date.now()
      if (remaining <= 0) break
      const response = await withDeadline(
        fetchTokenBookNFTsByAccount(wallet, { limit: OWNED_BOOKS_PAGE_SIZE, key }),
        remaining,
      )
      if (!response) break
      classIds.push(...response.data.map(nftClass => nftClass.address.toLowerCase()))
      const nextKey = getIndexerNextKey(response, OWNED_BOOKS_PAGE_SIZE)
      if (!nextKey) break
      key = nextKey.toString()
    }
  }
  catch (error) {
    // The indexer 404s a wallet that has never held a book — an empty shelf, not
    // a failure. Pages already drained stay usable either way.
    if (!(error instanceof FetchError) || error.statusCode !== 404) {
      console.warn('[for-you] Failed to fetch owned books:', error)
    }
  }
  return classIds
}

/**
 * Every book already on the wallet's shelf, owned or read — none of it is
 * eligible to be recommended. A failed source only weakens the exclusion for
 * this compute, which beats failing the whole feed.
 */
async function fetchShelfClassIds(wallet: string): Promise<string[]> {
  const [engagedClassIds, ownedClassIds] = await Promise.all([
    fetchEngagedBookClassIds(wallet).catch((error) => {
      console.warn('[for-you] Failed to read engaged books:', error)
      return []
    }),
    fetchOwnedBookClassIds(wallet),
  ])
  return [...new Set([...engagedClassIds, ...ownedClassIds])]
}

// Shares the feed's TTL, and seeded (per-product) feeds reuse the one entry
// instead of re-reading the shelf. No SWR: the only caller already awaits this
// inside a recompute, so a stale shelf would just widen the exclusion gap.
const fetchCachedShelfClassIds = defineCachedFunction(fetchShelfClassIds, {
  name: 'for-you-shelf',
  group: 'store',
  maxAge: FEED_CACHE_TTL_MS / 1000,
  getKey: (wallet: string) => wallet.toLowerCase(),
})

// A pool only generates candidates; matching happens against each product's own
// metadata, so a pool just records whether it is one of the rank priors.
interface CandidatePool {
  products: BookstoreCMSProduct[]
  isPopular?: boolean
  isLatest?: boolean
}

// The same book arrives from several pools with differing metadata — Airtable
// rows carry a fuller keyword list than the listing API's. Fills the scored
// fields in place on the caller's private copy, taking the richest value for
// each rather than letting whichever pool was first win.
function fillProductMetadata(target: BookstoreCMSProduct, incoming: BookstoreCMSProduct) {
  if (!target.genre && incoming.genre) target.genre = incoming.genre
  if (!target.authorName && incoming.authorName) target.authorName = incoming.authorName
  if (!target.locales?.length && incoming.locales?.length) target.locales = incoming.locales
  if ((incoming.keywords?.length || 0) > (target.keywords?.length || 0)) {
    target.keywords = incoming.keywords
  }
}

function mergeCandidatePools(pools: CandidatePool[]): RecommendationCandidate[] {
  const candidateMap = new Map<string, RecommendationCandidate>()
  for (const pool of pools) {
    pool.products.forEach((product, index) => {
      const classId = getCandidateClassId(product)
      if (!classId) return
      let candidate = candidateMap.get(classId)
      if (!candidate) {
        // Copy: fillProductMetadata writes back, and the products come from
        // shared caches that must not be mutated.
        candidate = { product: { ...product } }
        candidateMap.set(classId, candidate)
      }
      else {
        fillProductMetadata(candidate.product, product)
      }
      if (pool.isPopular) candidate.popularRank = Math.min(candidate.popularRank ?? index, index)
      if (pool.isLatest) candidate.latestRank = Math.min(candidate.latestRank ?? index, index)
    })
  }
  return [...candidateMap.values()]
}

async function fetchGenrePool(genre: string, isLibrary: boolean): Promise<BookstoreCMSProduct[]> {
  // Cache key shared with /api/store/genre page 1 so the pools piggyback on it.
  const { records } = await fetchWithAirtableCache(
    getGenreListingCacheKey(genre, GENRE_POOL_PAGE_SIZE, isLibrary),
    () => fetchAirtableCMSPublicationsByGenre(sanitizeAirtableGenre(genre), { pageSize: GENRE_POOL_PAGE_SIZE, isLibrary }),
  )
  return records
}

// Serves both author and keyword pools: Airtable's search formula is a substring
// match across Name/Description/Author/Keywords Text, so the query is identical
// either way. Keying by term alone lets the two roles share a cache entry.
async function fetchSearchTermPool(term: string, isLibrary: boolean): Promise<BookstoreCMSProduct[]> {
  const { records } = await fetchWithAirtableCache(
    getBookstoreScopedKey(`for-you:search:${term}:${SEARCH_POOL_PAGE_SIZE}`, isLibrary),
    () => fetchAirtableCMSPublicationsBySearchTerm(term, { pageSize: SEARCH_POOL_PAGE_SIZE, isLibrary }),
  )
  return records
}

// The popular/latest priors are global (per tab), so cache them per instance —
// otherwise every feed compute re-fetches 2 × 100 rows from the upstream API.
const fetchCachedPopularPool = defineCachedFunction(
  async (isLibrary: boolean) => {
    const { records } = await fetchBookstorePopularListing(BUILT_IN_LIST_PATHS.popular, { pageSize: PRIOR_POOL_PAGE_SIZE, isLibrary })
    return records
  },
  {
    name: 'for-you-popular-pool',
    group: 'store',
    swr: true,
    maxAge: 60,
    getKey: (isLibrary: boolean) => (isLibrary ? 'library' : 'store'),
  },
)

const fetchCachedLatestPool = defineCachedFunction(
  async (isLibrary: boolean) => {
    const { records } = await fetchBookstoreBookListing(BUILT_IN_LIST_PATHS.latest, { pageSize: PRIOR_POOL_PAGE_SIZE, isLibrary })
    return records
  },
  {
    name: 'for-you-latest-pool',
    group: 'store',
    swr: true,
    maxAge: 60,
    getKey: (isLibrary: boolean) => (isLibrary ? 'library' : 'store'),
  },
)

async function fetchSeedMetadata(seed: string): Promise<PortraitBookMetadata | undefined> {
  try {
    const { bookstoreInfo } = await fetchCachedNFTClassAggregatedMetadata(seed, ['bookstore'])
    return bookstoreInfo ? normalizePortraitMetadata(bookstoreInfo) : undefined
  }
  catch (error) {
    console.warn(`[for-you] Failed to fetch seed metadata for ${seed}:`, error)
    return undefined
  }
}

async function computeForYouRecommendations(
  wallet: string,
  { isLibrary = false, seed, limit = FOR_YOU_DEFAULT_PAGE_SIZE }: ForYouFetchOptions,
): Promise<FetchBookstoreForYouResponseData> {
  // Start the seed lookup early so it overlaps the Firestore reads.
  const seedMetadataPromise = seed ? fetchSeedMetadata(seed) : undefined
  const [portrait, userSettings, shelfClassIds] = await Promise.all([
    fetchUserPortrait(wallet),
    getUserSettings(wallet),
    fetchCachedShelfClassIds(wallet),
  ])
  const isAdultContentEnabled = !!userSettings.isAdultContentEnabled

  // A book already on the shelf is never a recommendation. The portrait's own
  // engaged ids are folded in so a failed shelf read still excludes the
  // recently read.
  const shelfClassIdSet = new Set([...shelfClassIds, ...portrait.engagedClassIds])
  const wishlistClassIdSet = new Set(portrait.wishlistClassIds)
  const seedClassId = seed?.toLowerCase()

  function getIsProductEligible(product: BookstoreCMSProduct): boolean {
    const classId = getCandidateClassId(product)
    if (!classId || classId === seedClassId) return false
    if (shelfClassIdSet.has(classId)) return false
    if (product.isAdultOnly && !isAdultContentEnabled) return false
    if (isLibrary && !product.isPlusReadingEnabled) return false
    return true
  }

  const isColdStart = portrait.signalBookCount < FOR_YOU_MIN_SIGNAL_BOOKS && !seed
  if (isColdStart) {
    // Latest is best-effort; losing popular still fails the compute, which is
    // what lets the caller fall back to a stale feed cache.
    const [popularProducts, latestProducts] = await Promise.all([
      fetchCachedPopularPool(isLibrary),
      fetchCachedLatestPool(isLibrary).catch((error) => {
        console.warn('[for-you] Cold-start latest pool failed:', error)
        return [] as BookstoreCMSProduct[]
      }),
    ])
    // Run through the same ranking as the personalized path. An empty portrait
    // scores on priors alone: a book that is both popular and recent outranks one
    // that is merely popular, a wishlisted book rises, and the diversity guard
    // breaks up author runs. Latest also extends the tail, so a reader who
    // already owns much of the popular list still gets a full page. Without this
    // the tab renders a reordering-free copy of the popular listing next to it.
    // The pools are raw upstream data, so they need the same gate as any other
    // candidate — otherwise a new reader's fallback feed is the one place adult
    // and already-read books slip through.
    const coldCandidates = mergeCandidatePools([
      { products: popularProducts, isPopular: true },
      { products: latestProducts, isLatest: true },
    ])
      .filter(candidate => getIsProductEligible(candidate.product))
      .map(candidate => ({
        ...candidate,
        isWishlisted: wishlistClassIdSet.has(getCandidateClassId(candidate.product)),
      }))
    const coldRanked = applyDiversityGuard(scoreCandidates(coldCandidates, portrait))
    return buildFeedResponse(coldRanked.map(candidate => candidate.product), false, limit)
  }

  const topGenres = getTopAffinityKeys(portrait.genres, CANDIDATE_GENRE_POOL_COUNT)
  const topAuthors = getTopAffinityKeys(portrait.authors, CANDIDATE_AUTHOR_POOL_COUNT)
  const topKeywords = getTopAffinityKeys(portrait.keywords, CANDIDATE_KEYWORD_POOL_COUNT)
  // Priors are also the fallback path: personalized pool failures only narrow
  // the candidate set, but losing every pool downgrades to an error. Started
  // before the seed metadata is awaited so a cold seed doesn't stall them.
  const poolPromises: Array<Promise<CandidatePool>> = [
    fetchCachedPopularPool(isLibrary).then(products => ({ products, isPopular: true })),
    fetchCachedLatestPool(isLibrary).then(products => ({ products, isLatest: true })),
  ]
  const genres = new Set(topGenres)
  const searchTerms = new Set([...topAuthors, ...topKeywords])

  const seedMetadata = await seedMetadataPromise
  if (seedMetadata?.genre) genres.add(seedMetadata.genre)
  if (seedMetadata?.authorName) searchTerms.add(seedMetadata.authorName)
  for (const keyword of filterMeaningfulKeywords(seedMetadata?.keywords).slice(0, SEED_KEYWORD_POOL_COUNT)) {
    searchTerms.add(keyword)
  }

  // Deduped: a seed facet that matches a top portrait facet would otherwise
  // issue the same Airtable query twice, since the cache can't collapse in-flight
  // requests.
  for (const genre of genres) {
    poolPromises.push(fetchGenrePool(genre, isLibrary).then(products => ({ products })))
  }
  for (const term of searchTerms) {
    poolPromises.push(fetchSearchTermPool(term, isLibrary).then(products => ({ products })))
  }

  const settledPools = await Promise.allSettled(poolPromises)
  const pools: CandidatePool[] = []
  settledPools.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      pools.push(outcome.value)
    }
    else {
      console.warn(`[for-you] Candidate pool ${index} failed:`, outcome.reason)
    }
  })
  if (pools.every(pool => !pool.products.length)) {
    throw new Error('ALL_CANDIDATE_POOLS_FAILED')
  }
  const popularProducts = pools.find(pool => pool.isPopular)?.products || []

  const candidates = mergeCandidatePools(pools)
    .filter(candidate => getIsProductEligible(candidate.product))
    .map(candidate => ({
      ...candidate,
      isWishlisted: wishlistClassIdSet.has(getCandidateClassId(candidate.product)),
    }))

  const ranked = applyDiversityGuard(scoreCandidates(candidates, portrait, seedMetadata))
  const records = ranked.slice(0, limit).map(candidate => candidate.product)

  // Backfill from popular so a sparse portrait still fills the page.
  if (records.length < limit) {
    const presentClassIds = new Set(records.map(getCandidateClassId))
    for (const product of popularProducts) {
      if (records.length >= limit) break
      const classId = getCandidateClassId(product)
      if (presentClassIds.has(classId) || !getIsProductEligible(product)) continue
      presentClassIds.add(classId)
      records.push(product)
    }
  }

  return buildFeedResponse(records, true, limit)
}

// Seeded (product-page/read-next) results are per (user × seed) so they only get
// a short per-instance cache; persisting every combination would bloat Firestore.
const fetchCachedSeededRecommendations = defineCachedFunction(
  (wallet: string, isLibrary: boolean, seed: string) =>
    computeForYouRecommendations(wallet, { isLibrary, seed, limit: FOR_YOU_SEEDED_PAGE_SIZE }),
  {
    name: 'for-you-seeded',
    group: 'store',
    swr: true,
    maxAge: 900,
    getKey: (wallet: string, isLibrary: boolean, seed: string) =>
      `${wallet.toLowerCase()}:${isLibrary ? '1' : '0'}:${seed.toLowerCase()}`,
  },
)

interface ForYouFeedCacheDocData {
  records: BookstoreCMSProduct[]
  isPersonalized: boolean
  computedAt: Timestamp
  limit: number
}

function getFeedCacheDocRef(wallet: string, isLibrary: boolean) {
  return getUserCacheDocRef(wallet, isLibrary ? 'for-you-library' : 'for-you-store')
}

/**
 * Serves the For You feed for a wallet. Non-seeded feeds go through a durable
 * Firestore read-through cache (per-instance memory would flush on deploys and
 * scale-out); a stale cached feed is also the fallback when recompute fails.
 */
export async function fetchForYouRecommendations(
  wallet: string,
  { isLibrary = false, seed, limit = FOR_YOU_DEFAULT_PAGE_SIZE }: ForYouFetchOptions = {},
): Promise<FetchBookstoreForYouResponseData> {
  if (seed) {
    const result = await fetchCachedSeededRecommendations(wallet, isLibrary, seed)
    return buildFeedResponse(result.records, result.isPersonalized, limit)
  }

  const cacheDocRef = getFeedCacheDocRef(wallet, isLibrary)
  let cached: ForYouFeedCacheDocData | undefined
  try {
    cached = (await cacheDocRef.get()).data() as ForYouFeedCacheDocData | undefined
  }
  catch (error) {
    console.warn('[for-you] Failed to read feed cache:', error)
  }
  const usableCache = cached && cached.limit >= limit ? cached : undefined
  if (usableCache && Date.now() - usableCache.computedAt.toMillis() < FEED_CACHE_TTL_MS) {
    return buildFeedResponse(usableCache.records, usableCache.isPersonalized, limit)
  }

  let result: FetchBookstoreForYouResponseData
  try {
    result = await computeForYouRecommendations(wallet, { isLibrary, limit })
  }
  catch (error) {
    if (usableCache) {
      console.warn('[for-you] Recompute failed, serving stale feed cache:', error)
      return buildFeedResponse(usableCache.records, usableCache.isPersonalized, limit)
    }
    throw error
  }

  // Fire-and-forget; JSON round-trip strips undefined, which Firestore rejects.
  cacheDocRef.set({
    records: JSON.parse(JSON.stringify(result.records)),
    isPersonalized: result.isPersonalized,
    computedAt: Timestamp.now(),
    limit,
  }).catch((error) => {
    console.warn('[for-you] Failed to write feed cache:', error)
  })

  return result
}
