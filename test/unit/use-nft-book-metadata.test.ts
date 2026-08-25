import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'

import { BOOKSTORE_INFO_QUERY_KEY, BOOKSTORE_PENDING_REVIEW_QUERY_KEY, NFT_CLASS_QUERY_KEY } from '~/utils/query-key-roots'
import {
  ensureNFTClassAggregatedMetadataThroughCache,
  fetchNFTClassAggregatedMetadataThroughCache,
  fetchNFTClassMessagesThroughCache,
  getBookstoreInfoByNFTClassIdFromCache,
  getIsBookstorePendingReviewFromCache,
  getNFTClassMessagesFromCache,
  getNFTClassMetadataByIdFromCache,
  revalidateNFTClassAggregatedMetadata,
  setBookstoreInfo,
  setBookstorePendingReview,
  setNFTClassData,
} from '~/composables/use-nft-book-metadata'

const { mockFetchAggregated, mockFetchMessages } = vi.hoisted(() => ({
  mockFetchAggregated: vi.fn(),
  mockFetchMessages: vi.fn(),
}))

mockNuxtImport('fetchCachedLikeCoinNFTClassAggregatedMetadataById', () => mockFetchAggregated)
mockNuxtImport('fetchPurchaseMessagesByNFTClassId', () => mockFetchMessages)

const metadata = { name: 'Book', symbol: 'BOOK' }
const bookstoreInfo = { ownerWallet: '0xowner', isHidden: false }

function makeAggregatedResponse(overrides = {}) {
  return {
    classData: metadata,
    bookstoreInfo,
    ownerInfo: null,
    ...overrides,
  }
}

// Session freshness/attempted sets are module-scoped and survive across tests,
// so every test uses its own class ID.
let idCounter = 0
function nextClassId() {
  idCounter += 1
  return `0xc1a55${idCounter.toString(16).padStart(4, '0')}`
}

async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('use-nft-book-metadata', () => {
  let queryCache: ReturnType<typeof useQueryCache>

  beforeEach(() => {
    queryCache = useQueryCache()
    queryCache.getEntries().forEach(entry => queryCache.remove(entry))
    mockFetchAggregated.mockReset()
    mockFetchMessages.mockReset()
  })

  it('seeds both cache entries from one aggregated fetch and returns the raw response', async () => {
    const nftClassId = nextClassId()
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse())

    const data = await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    expect(data).toEqual(makeAggregatedResponse())
    expect(getNFTClassMetadataByIdFromCache(queryCache, nftClassId)).toEqual(metadata)
    expect(getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)).toEqual(bookstoreInfo)
  })

  it('does not clobber caches when the response omits slices', async () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)
    mockFetchAggregated.mockResolvedValue(
      makeAggregatedResponse({ classData: null, bookstoreInfo: undefined }))

    await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId, { nocache: true })

    expect(getNFTClassMetadataByIdFromCache(queryCache, nftClassId)).toEqual(metadata)
    expect(getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)).toEqual(bookstoreInfo)
  })

  it('merge-writes NFT class data with a normalized address', () => {
    const nftClassId = nextClassId()
    const upperCaseId = nftClassId.toUpperCase().replace('0XC', '0xC')
    setNFTClassData(queryCache, upperCaseId, { name: 'Book', symbol: 'BOOK' })
    setNFTClassData(queryCache, nftClassId, { metadata })

    expect(queryCache.getQueryData([NFT_CLASS_QUERY_KEY, nftClassId])).toEqual({
      address: nftClassId,
      name: 'Book',
      symbol: 'BOOK',
      metadata,
    })
  })

  it('serves the cached pair without fetching and revalidates once in the background', async () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse())

    const data = await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    expect(data).toEqual({ classData: metadata, bookstoreInfo, ownerInfo: null })
    await flushMicrotasks()
    // The background revalidation is the only fetch, and it busts the CDN.
    expect(mockFetchAggregated).toHaveBeenCalledTimes(1)
    expect(mockFetchAggregated).toHaveBeenCalledWith(
      nftClassId, { include: ['class_chain', 'bookstore'], nocache: true })

    // A second touch neither refetches nor re-revalidates (session-fresh now).
    await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)
    await flushMicrotasks()
    expect(mockFetchAggregated).toHaveBeenCalledTimes(1)
  })

  it('excludes cached slices from the fetch when the pair is incomplete', async () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse({ classData: null }))

    await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    expect(mockFetchAggregated).toHaveBeenCalledWith(
      nftClassId, { exclude: ['class_chain'], nocache: false })
  })

  it('bypasses the cache entirely with nocache', async () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse())

    await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId, { nocache: true })

    expect(mockFetchAggregated).toHaveBeenCalledWith(nftClassId, { exclude: [], nocache: true })
  })

  it('does not revalidate classes already confirmed live this session', async () => {
    const nftClassId = nextClassId()
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse())

    // A nocache fetch requesting both slices confirms liveness.
    await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId, { nocache: true })
    await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)
    await flushMicrotasks()

    expect(mockFetchAggregated).toHaveBeenCalledTimes(1)
  })

  it('bounds background revalidations to six concurrent fetches, coalesced by id', async () => {
    const nftClassIds = Array.from({ length: 10 }, () => nextClassId())
    const resolvers: Array<() => void> = []
    mockFetchAggregated.mockImplementation(() => new Promise((resolve) => {
      resolvers.push(() => resolve(makeAggregatedResponse()))
    }))

    // Duplicates coalesce: passing each id twice must not double the requests.
    revalidateNFTClassAggregatedMetadata(queryCache, [...nftClassIds, ...nftClassIds])
    expect(mockFetchAggregated).toHaveBeenCalledTimes(6)

    resolvers.splice(0).forEach(resolve => resolve())
    await flushMicrotasks()
    expect(mockFetchAggregated).toHaveBeenCalledTimes(10)

    resolvers.splice(0).forEach(resolve => resolve())
    await flushMicrotasks()
  })

  it('skips identity-changing writes when the data is unchanged', () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)
    const nftState = queryCache.get([NFT_CLASS_QUERY_KEY, nftClassId])!.state.value
    const infoState = queryCache.get([BOOKSTORE_INFO_QUERY_KEY, nftClassId])!.state.value

    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)

    expect(queryCache.get([NFT_CLASS_QUERY_KEY, nftClassId])!.state.value).toBe(nftState)
    expect(queryCache.get([BOOKSTORE_INFO_QUERY_KEY, nftClassId])!.state.value).toBe(infoState)
  })

  it('keeps cache lookups reactive for entries created later', () => {
    const nftClassId = nextClassId()
    const lookup = computed(() => getNFTClassMetadataByIdFromCache(queryCache, nftClassId))

    expect(lookup.value).toBeUndefined()
    setNFTClassData(queryCache, nftClassId, { metadata })
    expect(lookup.value).toEqual(metadata)
  })

  it('treats a cached null bookstore listing as absent for the exclude computation', async () => {
    const nftClassId = nextClassId()
    setNFTClassData(queryCache, nftClassId, { metadata })
    setBookstoreInfo(queryCache, nftClassId, null)
    mockFetchAggregated.mockResolvedValue(makeAggregatedResponse())

    await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    // null means "known to have no listing", but parity with the old store is
    // to refetch the bookstore slice rather than trust it.
    expect(mockFetchAggregated).toHaveBeenCalledWith(
      nftClassId, { exclude: ['class_chain'], nocache: false })
  })

  it('fetches and caches purchase messages through the cache', async () => {
    const nftClassId = nextClassId()
    const messages = [{ message: 'hi', wallet: '0xbuyer' }]
    mockFetchMessages.mockResolvedValue({ messages })

    const first = await fetchNFTClassMessagesThroughCache(queryCache, nftClassId)
    const second = await fetchNFTClassMessagesThroughCache(queryCache, nftClassId)

    expect(first).toEqual(messages)
    expect(second).toEqual(messages)
    expect(mockFetchMessages).toHaveBeenCalledTimes(1)
  })

  it('caches a 404 as an empty message list instead of rejecting', async () => {
    const nftClassId = nextClassId()
    mockFetchMessages.mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 }))

    const first = await fetchNFTClassMessagesThroughCache(queryCache, nftClassId)
    const second = await fetchNFTClassMessagesThroughCache(queryCache, nftClassId)

    // 404 is this book's terminal answer, so the empty result is served from
    // cache rather than refetched.
    expect(first).toEqual([])
    expect(second).toEqual([])
    expect(mockFetchMessages).toHaveBeenCalledTimes(1)
  })

  it('rethrows a transient message failure rather than caching it as empty', async () => {
    const nftClassId = nextClassId()
    mockFetchMessages.mockRejectedValue(Object.assign(new Error('Bad Gateway'), { statusCode: 502 }))

    await expect(fetchNFTClassMessagesThroughCache(queryCache, nftClassId)).rejects.toThrow('Bad Gateway')
    // These options never expire, so an empty result would stick all session.
    expect(getNFTClassMessagesFromCache(queryCache, nftClassId)).toBeUndefined()
  })

  it('records a listing the API withheld pending review', async () => {
    const nftClassId = nextClassId()
    mockFetchAggregated.mockResolvedValue(
      makeAggregatedResponse({ bookstoreInfo: null, isBookstorePendingReview: true }))

    await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    expect(getIsBookstorePendingReviewFromCache(queryCache, nftClassId)).toBe(true)
  })

  it('materialises no entry for a book that is not withheld', async () => {
    const nftClassId = nextClassId()
    mockFetchAggregated.mockResolvedValue(
      makeAggregatedResponse({ isBookstorePendingReview: false }))

    await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId)

    // Seed-only entries are never evicted, so the common case must not create one.
    expect(queryCache.get([BOOKSTORE_PENDING_REVIEW_QUERY_KEY, nftClassId])).toBeUndefined()
    expect(getIsBookstorePendingReviewFromCache(queryCache, nftClassId)).toBeUndefined()
  })

  it('clears the withheld flag once the listing is approved', () => {
    const nftClassId = nextClassId()
    setBookstorePendingReview(queryCache, nftClassId, true)
    setBookstorePendingReview(queryCache, nftClassId, false)

    expect(getIsBookstorePendingReviewFromCache(queryCache, nftClassId)).toBe(false)
  })

  it('keeps seed-only entries out of the garbage collector', () => {
    const nftClassId = nextClassId()
    setBookstoreInfo(queryCache, nftClassId, bookstoreInfo)

    const entry = queryCache.get([BOOKSTORE_INFO_QUERY_KEY, nftClassId])
    // Entries without options are never scheduled for GC — parity with the
    // never-evicting Pinia maps this composable replaces.
    expect(entry?.options).toBeNull()
  })
})
