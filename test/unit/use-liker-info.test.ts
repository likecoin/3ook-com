import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'

import {
  LIKER_INFO_QUERY_KEY,
  fetchLikerInfoByIdThroughCache,
  fetchLikerInfoByWalletAddressThroughCache,
  getLikerInfoByIdQueryOptions,
} from '~/composables/use-liker-info'

const { mockFetchById, mockFetchByWallet } = vi.hoisted(() => ({
  mockFetchById: vi.fn(),
  mockFetchByWallet: vi.fn(),
}))

mockNuxtImport('fetchLikerPublicInfoById', () => mockFetchById)
mockNuxtImport('fetchLikerPublicInfoByWalletAddress', () => mockFetchByWallet)

const responseData = {
  user: 'alice',
  displayName: 'Alice',
  avatar: 'https://example.com/alice.png',
  cosmosWallet: 'cosmos1alice',
  likeWallet: 'like1alice',
  evmWallet: '0xa11ce',
  description: 'Hello',
}

const normalizedInfo = {
  likerId: 'alice',
  displayName: 'Alice',
  avatarSrc: 'https://example.com/alice.png',
  cosmosWallet: 'cosmos1alice',
  likeWallet: 'like1alice',
  evmWallet: '0xa11ce',
  description: 'Hello',
  isLikerPlus: false,
}

describe('use-liker-info query options', () => {
  let queryCache: ReturnType<typeof useQueryCache>

  beforeEach(() => {
    // The query cache is a Pinia store on the test app; drop its entries so
    // the cache-forever options can't leak state across tests.
    queryCache = useQueryCache()
    queryCache.getEntries().forEach(entry => queryCache.remove(entry))
    mockFetchById.mockReset()
    mockFetchByWallet.mockReset()
  })

  it('normalizes the by-id response and seeds the by-wallet cache', async () => {
    mockFetchById.mockResolvedValue(responseData)

    const info = await fetchLikerInfoByIdThroughCache(queryCache, 'alice')

    expect(mockFetchById).toHaveBeenCalledWith('alice', { nocache: false })
    expect(info).toEqual(normalizedInfo)
    expect(queryCache.getQueryData([LIKER_INFO_QUERY_KEY, 'wallet', '0xa11ce']))
      .toEqual(normalizedInfo)
  })

  it('does not seed the by-wallet cache when the profile has no EVM wallet', async () => {
    mockFetchById.mockResolvedValue({ ...responseData, evmWallet: undefined })

    await fetchLikerInfoByIdThroughCache(queryCache, 'alice')

    const walletEntries = queryCache.getEntries({ key: [LIKER_INFO_QUERY_KEY, 'wallet'] })
    expect(walletEntries).toHaveLength(0)
  })

  it('normalizes the by-wallet response and seeds the by-id cache', async () => {
    mockFetchByWallet.mockResolvedValue(responseData)

    const info = await fetchLikerInfoByWalletAddressThroughCache(queryCache, '0xa11ce')

    expect(mockFetchByWallet).toHaveBeenCalledWith('0xa11ce')
    expect(info).toEqual(normalizedInfo)
    expect(queryCache.getQueryData([LIKER_INFO_QUERY_KEY, 'id', 'alice']))
      .toEqual(normalizedInfo)
  })

  it('passes nocache through to the fetcher and marks the data stale', async () => {
    mockFetchById.mockResolvedValue(responseData)
    const options = getLikerInfoByIdQueryOptions({ queryCache, likerId: 'alice', nocache: true })

    await fetchLikerInfoByIdThroughCache(queryCache, 'alice', { nocache: true })

    expect(mockFetchById).toHaveBeenCalledWith('alice', { nocache: true })
    expect(options.staleTime).toBe(0)
  })

  // The query fn is per-entry (last caller wins), so a shared key would let the
  // CDN-busting fetcher serve plain reads, silently no-oping `?nocache=1`.
  it('keeps the nocache fetcher off the canonical key', () => {
    expect(getLikerInfoByIdQueryOptions({ queryCache, likerId: 'alice' }).key)
      .not.toEqual(getLikerInfoByIdQueryOptions({ queryCache, likerId: 'alice', nocache: true }).key)
  })

  it('seeds the canonical and by-wallet caches from a nocache fetch', async () => {
    mockFetchById.mockResolvedValue(responseData)

    await fetchLikerInfoByIdThroughCache(queryCache, 'alice', { nocache: true })

    // The fresh profile has to reach the plain observers, or `?nocache=1` would
    // strand it in a side entry that nothing renders.
    expect(queryCache.getQueryData([LIKER_INFO_QUERY_KEY, 'id', 'alice']))
      .toEqual(normalizedInfo)
    expect(queryCache.getQueryData([LIKER_INFO_QUERY_KEY, 'wallet', '0xa11ce']))
      .toEqual(normalizedInfo)
  })

  it('dedupes concurrent fetches of the same key', async () => {
    mockFetchById.mockResolvedValue(responseData)

    await Promise.all([
      fetchLikerInfoByIdThroughCache(queryCache, 'alice'),
      fetchLikerInfoByIdThroughCache(queryCache, 'alice'),
    ])

    expect(mockFetchById).toHaveBeenCalledTimes(1)
  })

  it('caches forever and never evicts', () => {
    const options = getLikerInfoByIdQueryOptions({ queryCache, likerId: 'alice' })

    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(false)
  })
})
