import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'

import { useBookstoreStore } from '~/stores/bookstore'

const { mockFetchStakingBookNFTs } = vi.hoisted(() => ({
  mockFetchStakingBookNFTs: vi.fn(),
}))

mockNuxtImport('fetchStakingBookNFTs', () => mockFetchStakingBookNFTs)

const SORT_BY = 'staked_amount'

function makePage(addresses: string[], nextKey: number) {
  return {
    data: addresses.map(address => ({
      evm_address: address,
      staked_amount: '100',
      number_of_stakers: 1,
      last_staked_at: '2026-07-22T00:00:00Z',
    })),
    pagination: { next_key: nextKey, count: 99 },
  }
}

// Storage-shaped, not store-shaped: totalStaked stays a tagged string until the
// store's serializer revives it.
function makePersistedItem(nftClassId: string, likeRank: number) {
  return { nftClassId, totalStaked: '$bigint:100', stakerCount: 1, likeRank }
}

describe('staking books cache restore', () => {
  let store: ReturnType<typeof useBookstoreStore>

  // Writes what a previous session left behind, then replays the hydration the
  // persistence plugin runs on boot — real serializer, real afterHydrate.
  function restoreFromStorage(entry: Record<string, unknown>) {
    localStorage.setItem(store.$id, JSON.stringify({
      stakingBooksMap: { [SORT_BY]: entry },
    }))
    store.$hydrate()
  }

  beforeEach(async () => {
    store = useBookstoreStore()
    // The store is a singleton across this file, and $hydrate patches rather than
    // replaces, so clear the map before seeding the next session's leftovers.
    store.stakingBooksMap = {}
    await nextTick()
    // The app wraps storage in a debounced buffer that serves reads from its own
    // pending writes, which would mask the seed below. pagehide is how the wrapper
    // flushes on a real unload, so use it to drain the buffer.
    window.dispatchEvent(new Event('pagehide'))
    mockFetchStakingBookNFTs.mockReset()
  })

  it('keeps restored items on screen but does not count them as fetched', async () => {
    restoreFromStorage({
      items: [makePersistedItem('0xstale', 1)],
      // Killed mid-fetch, with no cursor left to follow.
      isFetching: true,
      hasFetched: true,
    })

    // Restored items paint immediately so the grid never flashes empty...
    expect(store.getStakingBooks(SORT_BY).items).toHaveLength(1)
    // ...as real items, not the tagged strings they were serialized as.
    expect(store.getStakingBooks(SORT_BY).items[0]!.totalStaked).toBe(100n)
    // ...but nothing was fetched this session, so the listing must still revalidate.
    expect(store.getStakingBooks(SORT_BY).hasFetchedItems).toBe(false)
    expect(store.getStakingBooks(SORT_BY).isFetchingItems).toBe(false)

    mockFetchStakingBookNFTs.mockResolvedValueOnce(makePage(['0xA', '0xB'], 2))
    await store.fetchStakingBooks(SORT_BY, { limit: 2 })

    expect(mockFetchStakingBookNFTs).toHaveBeenCalledTimes(1)
    expect(store.getStakingBooks(SORT_BY).items.map(item => item.nftClassId))
      .toEqual(['0xa', '0xb'])
  })

  it('drops a restored cursor so page 2 cannot stack onto a stale page 1', async () => {
    restoreFromStorage({
      items: ['0xstale1', '0xstale2', '0xstale3'].map((id, index) => makePersistedItem(id, index + 1)),
      isFetching: false,
      hasFetched: true,
      offset: '3',
    })

    // Guards the assertions below against passing on an empty restore.
    expect(store.getStakingBooks(SORT_BY).items).toHaveLength(3)
    expect(store.getStakingBooks(SORT_BY).nextItemsKey).toBeUndefined()

    mockFetchStakingBookNFTs.mockResolvedValueOnce(makePage(['0xA', '0xB', '0xC'], 3))
    await store.fetchStakingBooks(SORT_BY, { limit: 3 })

    // Page 1 without the previous session's key, replacing rather than appending.
    expect(mockFetchStakingBookNFTs).toHaveBeenCalledWith(
      expect.objectContaining({ key: undefined }),
    )
    expect(store.getStakingBooks(SORT_BY).items.map(item => item.nftClassId))
      .toEqual(['0xa', '0xb', '0xc'])
  })
})
