import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { QueryClient } from '@tanstack/vue-query'

import {
  LIKER_INFO_QUERY_KEY,
  getLikerInfoByIdQueryOptions,
  getLikerInfoByWalletAddressQueryOptions,
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
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    mockFetchById.mockReset()
    mockFetchByWallet.mockReset()
  })

  it('normalizes the by-id response and seeds the by-wallet cache', async () => {
    mockFetchById.mockResolvedValue(responseData)

    const info = await queryClient.fetchQuery(getLikerInfoByIdQueryOptions({ likerId: 'alice' }))

    expect(mockFetchById).toHaveBeenCalledWith('alice', { nocache: false })
    expect(info).toEqual(normalizedInfo)
    expect(queryClient.getQueryData([LIKER_INFO_QUERY_KEY, 'wallet', '0xa11ce']))
      .toEqual(normalizedInfo)
  })

  it('does not seed the by-wallet cache when the profile has no EVM wallet', async () => {
    mockFetchById.mockResolvedValue({ ...responseData, evmWallet: undefined })

    await queryClient.fetchQuery(getLikerInfoByIdQueryOptions({ likerId: 'alice' }))

    const walletQueries = queryClient.getQueryCache()
      .findAll({ queryKey: [LIKER_INFO_QUERY_KEY, 'wallet'] })
    expect(walletQueries).toHaveLength(0)
  })

  it('normalizes the by-wallet response and seeds the by-id cache', async () => {
    mockFetchByWallet.mockResolvedValue(responseData)

    const info = await queryClient.fetchQuery(
      getLikerInfoByWalletAddressQueryOptions({ walletAddress: '0xa11ce' }))

    expect(mockFetchByWallet).toHaveBeenCalledWith('0xa11ce')
    expect(info).toEqual(normalizedInfo)
    expect(queryClient.getQueryData([LIKER_INFO_QUERY_KEY, 'id', 'alice']))
      .toEqual(normalizedInfo)
  })

  it('passes nocache through to the fetcher and marks the data stale', async () => {
    mockFetchById.mockResolvedValue(responseData)
    const options = getLikerInfoByIdQueryOptions({ likerId: 'alice', nocache: true })

    await queryClient.fetchQuery(options)

    expect(mockFetchById).toHaveBeenCalledWith('alice', { nocache: true })
    expect(options.staleTime).toBe(0)
  })

  // queryFn is per-query (last observer wins), so a shared key would let the
  // CDN-busting fetcher serve plain reads, silently no-oping `?nocache=1`.
  it('keeps the nocache fetcher off the canonical key', () => {
    expect(getLikerInfoByIdQueryOptions({ likerId: 'alice' }).queryKey)
      .not.toEqual(getLikerInfoByIdQueryOptions({ likerId: 'alice', nocache: true }).queryKey)
  })

  it('seeds the canonical and by-wallet caches from a nocache fetch', async () => {
    mockFetchById.mockResolvedValue(responseData)

    await queryClient.fetchQuery(getLikerInfoByIdQueryOptions({ likerId: 'alice', nocache: true }))

    // The fresh profile has to reach the plain observers, or `?nocache=1` would
    // strand it in a side entry that nothing renders.
    expect(queryClient.getQueryData([LIKER_INFO_QUERY_KEY, 'id', 'alice']))
      .toEqual(normalizedInfo)
    expect(queryClient.getQueryData([LIKER_INFO_QUERY_KEY, 'wallet', '0xa11ce']))
      .toEqual(normalizedInfo)
  })

  it('dedupes concurrent fetches of the same key', async () => {
    mockFetchById.mockResolvedValue(responseData)

    await Promise.all([
      queryClient.fetchQuery(getLikerInfoByIdQueryOptions({ likerId: 'alice' })),
      queryClient.fetchQuery(getLikerInfoByIdQueryOptions({ likerId: 'alice' })),
    ])

    expect(mockFetchById).toHaveBeenCalledTimes(1)
  })

  it('caches forever and never stacks retries on the fetcher', () => {
    const options = getLikerInfoByIdQueryOptions({ likerId: 'alice' })

    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(Infinity)
    expect(options.retry).toBe(false)
  })
})
