import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import { useStakingStore } from '~/stores/staking'

const WALLET = '0xWallet'

const {
  mockFetchCollectiveAccountStakings,
  mockGetWalletPendingRewardsOfNFTClass,
  mockGetWalletStakeOfNFTClass,
} = vi.hoisted(() => ({
  mockFetchCollectiveAccountStakings: vi.fn(),
  mockGetWalletPendingRewardsOfNFTClass: vi.fn(),
  mockGetWalletStakeOfNFTClass: vi.fn(),
}))

mockNuxtImport('fetchCollectiveAccountStakings', () => mockFetchCollectiveAccountStakings)
mockNuxtImport('useUserSession', () => () => ({ loggedIn: ref(true) }))
mockNuxtImport('useLikeCollectiveContract', () => () => ({
  getWalletPendingRewardsOfNFTClass: mockGetWalletPendingRewardsOfNFTClass,
  getWalletStakeOfNFTClass: mockGetWalletStakeOfNFTClass,
}))

// The indexer keys book_nft in checksummed form; the store keys its items lowercase.
const CHECKSUMMED = '0x9A4C8cAA9daE0706af8B7afC0e3e1ba2fA825067'
const LOWERCASE = CHECKSUMMED.toLowerCase()

function makeStakingsResponse(
  stakings: Array<{ bookNFT: string, staked: string, pending: string }>,
  nextKey = 0,
) {
  return {
    data: stakings.map(({ bookNFT, staked, pending }) => ({
      book_nft: bookNFT,
      account: WALLET,
      pool_share: '0',
      staked_amount: staked,
      pending_reward_amount: pending,
      claimed_reward_amount: '0',
    })),
    pagination: { next_key: nextKey, count: stakings.length },
  }
}

// Distinct book addresses so a dropped page shows up as missing items.
function makePage(count: number, offset: number) {
  return Array.from({ length: count }, (_, index) => ({
    bookNFT: `0x${(offset + index).toString(16).padStart(40, '0')}`,
    staked: '1000',
    pending: '1',
  }))
}

describe('staking store rewards', () => {
  let store: ReturnType<typeof useStakingStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useStakingStore()
    mockFetchCollectiveAccountStakings.mockReset()
    mockGetWalletPendingRewardsOfNFTClass.mockReset()
    mockGetWalletStakeOfNFTClass.mockReset()
  })

  it('clears rewards when a successful fetch reports nothing staked', async () => {
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(
      makeStakingsResponse([{ bookNFT: CHECKSUMMED, staked: '1000', pending: '500' }]),
    )
    await store.fetchUserStakingData(WALLET)
    expect(store.getUserStakingData(WALLET).totalUnclaimedRewards).toBe(500n)

    // A claim empties the list; the card must be able to fall back to zero.
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(makeStakingsResponse([]))
    await store.fetchUserStakingData(WALLET)

    expect(store.getUserStakingData(WALLET).items).toEqual([])
    expect(store.getUserStakingData(WALLET).totalUnclaimedRewards).toBe(0n)
  })

  it('keeps the last known rewards when the indexer fetch fails', async () => {
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(
      makeStakingsResponse([{ bookNFT: CHECKSUMMED, staked: '1000', pending: '500' }]),
    )
    await store.fetchUserStakingData(WALLET)

    mockFetchCollectiveAccountStakings.mockRejectedValueOnce(new Error('indexer down'))
    await store.fetchUserStakingData(WALLET)

    expect(store.getUserStakingData(WALLET).items).toHaveLength(1)
    expect(store.getUserStakingData(WALLET).totalUnclaimedRewards).toBe(500n)
  })

  it('follows the cursor until every staking page is fetched', async () => {
    mockFetchCollectiveAccountStakings
      .mockResolvedValueOnce(makeStakingsResponse(makePage(100, 0), 100))
      .mockResolvedValueOnce(makeStakingsResponse(makePage(100, 100), 200))
      .mockResolvedValueOnce(makeStakingsResponse(makePage(11, 200), 0))

    await store.fetchUserStakingData(WALLET)

    expect(mockFetchCollectiveAccountStakings).toHaveBeenCalledTimes(3)
    expect(mockFetchCollectiveAccountStakings.mock.calls[0]?.[1]).toEqual({ 'pagination.limit': 100 })
    expect(mockFetchCollectiveAccountStakings.mock.calls[1]?.[1]).toMatchObject({ 'pagination.key': 100 })
    expect(mockFetchCollectiveAccountStakings.mock.calls[2]?.[1]).toMatchObject({ 'pagination.key': 200 })

    const { items, totalUnclaimedRewards } = store.getUserStakingData(WALLET)
    expect(items).toHaveLength(211)
    expect(totalUnclaimedRewards).toBe(211n)
  })

  it('stops paging when an exactly-full page reports next_key 0', async () => {
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(
      makeStakingsResponse(makePage(100, 0), 0),
    )

    await store.fetchUserStakingData(WALLET)

    expect(mockFetchCollectiveAccountStakings).toHaveBeenCalledTimes(1)
    expect(store.getUserStakingData(WALLET).items).toHaveLength(100)
  })

  it('keeps the last known items when a later page fails mid-loop', async () => {
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(
      makeStakingsResponse([{ bookNFT: CHECKSUMMED, staked: '1000', pending: '500' }]),
    )
    await store.fetchUserStakingData(WALLET)

    mockFetchCollectiveAccountStakings
      .mockResolvedValueOnce(makeStakingsResponse(makePage(100, 0), 100))
      .mockRejectedValueOnce(new Error('indexer down'))
    await store.fetchUserStakingData(WALLET)

    const { items, totalUnclaimedRewards } = store.getUserStakingData(WALLET)
    expect(items).toHaveLength(1)
    expect(items[0]?.nftClassId).toBe(LOWERCASE)
    expect(totalUnclaimedRewards).toBe(500n)
  })

  it('updates the existing row when a per-book refresh uses checksummed casing', async () => {
    mockFetchCollectiveAccountStakings.mockResolvedValueOnce(
      makeStakingsResponse([{ bookNFT: CHECKSUMMED, staked: '1000', pending: '500' }]),
    )
    await store.fetchUserStakingData(WALLET)

    // The product page passes the route param through unchanged.
    mockGetWalletStakeOfNFTClass.mockResolvedValueOnce(1000n)
    mockGetWalletPendingRewardsOfNFTClass.mockResolvedValueOnce(0n)
    await store.fetchNFTClassStakingData(WALLET, CHECKSUMMED)

    const { items, totalUnclaimedRewards } = store.getUserStakingData(WALLET)
    expect(items).toHaveLength(1)
    expect(items[0]?.nftClassId).toBe(LOWERCASE)
    expect(totalUnclaimedRewards).toBe(0n)
  })
})
