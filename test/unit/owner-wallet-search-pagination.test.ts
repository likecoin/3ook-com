import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import { useBookstoreStore } from '~/stores/bookstore'

const { mockFetchAll, mockPrefetch } = vi.hoisted(() => ({
  mockFetchAll: vi.fn(),
  mockPrefetch: vi.fn(),
}))

mockNuxtImport('fetchAllNFTClassesByOwnerWalletAddress', () => mockFetchAll)
mockNuxtImport('prefetchBookstoreInfo', () => mockPrefetch)

const WALLET = '0x089519f336825608EaBbdb2d81138E8A0d1613F2'
const PAGE_SIZE = 100

// Chain order is oldest-published first, so the sort must reverse it.
function makeCatalogue(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    address: `0xbook${String(index).padStart(3, '0')}`,
    name: `Book ${index}`,
    metadata: { datePublished: new Date(Date.UTC(2000, 0, 1 + index)).toISOString() },
  }))
}

function getExpectedClassIds(count: number) {
  return Array.from({ length: count }, (_, index) => `0xbook${String(count - 1 - index).padStart(3, '0')}`)
}

describe('owner_wallet search local pagination', () => {
  let store: ReturnType<typeof useBookstoreStore>

  function getState() {
    return store.bookstoreSearchResultsByQueryMap[`owner_wallet:${WALLET}`]
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBookstoreStore()
    mockFetchAll.mockReset()
    mockPrefetch.mockReset()
  })

  it('pages the sorted catalogue out locally, newest publication first', async () => {
    mockFetchAll.mockResolvedValue(makeCatalogue(250))

    await store.fetchSearchResults('owner_wallet', WALLET, { isRefresh: true })
    expect(getState()?.items).toHaveLength(PAGE_SIZE)
    expect(getState()?.nextKey).toBe('100')

    await store.fetchSearchResults('owner_wallet', WALLET)
    expect(getState()?.nextKey).toBe('200')

    await store.fetchSearchResults('owner_wallet', WALLET)
    expect(getState()?.nextKey).toBeUndefined()

    expect(getState()?.items.map(item => item.classId)).toEqual(getExpectedClassIds(250))
    // The indexer is walked once; later pages come from the held list.
    expect(mockFetchAll).toHaveBeenCalledTimes(1)
    // Each page only waits on bookstore info for its own rows.
    expect(mockPrefetch.mock.calls.map(([, classIds]) => classIds.length)).toEqual([100, 100, 50])
  })

  it('refetches and restarts from the first page on refresh', async () => {
    mockFetchAll.mockResolvedValue(makeCatalogue(150))
    await store.fetchSearchResults('owner_wallet', WALLET, { isRefresh: true })
    await store.fetchSearchResults('owner_wallet', WALLET)
    expect(getState()?.items).toHaveLength(150)

    mockFetchAll.mockResolvedValue(makeCatalogue(120))
    await store.fetchSearchResults('owner_wallet', WALLET, { isRefresh: true })

    expect(mockFetchAll).toHaveBeenCalledTimes(2)
    expect(getState()?.items.map(item => item.classId)).toEqual(getExpectedClassIds(120).slice(0, PAGE_SIZE))
    expect(getState()?.nextKey).toBe('100')
  })
})
