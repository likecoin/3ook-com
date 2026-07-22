import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import { useBookstoreStore } from '~/stores/bookstore'

const { mockFetchStakingBookNFTs } = vi.hoisted(() => ({
  mockFetchStakingBookNFTs: vi.fn(),
}))

mockNuxtImport('fetchStakingBookNFTs', () => mockFetchStakingBookNFTs)

const SORT_BY = 'staked_amount'

function makeBookNFT(address: string) {
  return {
    evm_address: address,
    staked_amount: '100',
    number_of_stakers: 1,
    last_staked_at: '2026-07-22T00:00:00Z',
  }
}

function makePage(addresses: string[], nextKey: number) {
  return {
    data: addresses.map(makeBookNFT),
    pagination: { next_key: nextKey, count: 99 },
  }
}

describe('fetchStakingBooks pagination', () => {
  let store: ReturnType<typeof useBookstoreStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBookstoreStore()
    mockFetchStakingBookNFTs.mockReset()
  })

  it('drops a book the indexer returns on both sides of the page boundary', async () => {
    mockFetchStakingBookNFTs
      .mockResolvedValueOnce(makePage(['0xA', '0xB', '0xC'], 3))
      // 0xC repeats: its rank shifted across the offset boundary between requests.
      .mockResolvedValueOnce(makePage(['0xC', '0xD', '0xE'], 6))

    await store.fetchStakingBooks(SORT_BY, { limit: 3 })
    await store.fetchStakingBooks(SORT_BY, { limit: 3 })

    expect(store.getStakingBooks(SORT_BY).items.map(item => item.nftClassId))
      .toEqual(['0xa', '0xb', '0xc', '0xd', '0xe'])
  })

  it('replaces rather than appends when a failed refresh left no cursor', async () => {
    mockFetchStakingBookNFTs.mockResolvedValueOnce(makePage(['0xA', '0xB', '0xC'], 3))
    await store.fetchStakingBooks(SORT_BY, { limit: 3 })

    // A refresh clears the cursor before it resolves, then fails.
    mockFetchStakingBookNFTs.mockRejectedValueOnce(new Error('network'))
    await expect(store.fetchStakingBooks(SORT_BY, { isRefresh: true, limit: 3 })).rejects.toThrow('network')
    expect(store.getStakingBooks(SORT_BY).items).toHaveLength(3)

    // The next scroll fetches page 1 again; it must not stack onto the retained items.
    mockFetchStakingBookNFTs.mockResolvedValueOnce(makePage(['0xA', '0xB', '0xC'], 3))
    await store.fetchStakingBooks(SORT_BY, { limit: 3 })

    expect(store.getStakingBooks(SORT_BY).items.map(item => item.nftClassId))
      .toEqual(['0xa', '0xb', '0xc'])
  })

  it('stops paginating when a full last page reports next_key 0', async () => {
    // The indexer reports end-of-list as 0, which is also the start of the list.
    mockFetchStakingBookNFTs.mockResolvedValueOnce(makePage(['0xA', '0xB', '0xC'], 0))

    await store.fetchStakingBooks(SORT_BY, { limit: 3 })
    expect(store.getStakingBooks(SORT_BY).nextItemsKey).toBeUndefined()

    await store.fetchStakingBooks(SORT_BY, { limit: 3 })
    expect(mockFetchStakingBookNFTs).toHaveBeenCalledTimes(1)
    expect(store.getStakingBooks(SORT_BY).items).toHaveLength(3)
  })
})
