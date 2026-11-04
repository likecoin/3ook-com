import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

import { useBookshelfStore } from '~/stores/bookshelf'

const {
  mockFetchTokenBookNFTsByAccount,
  mockFetchNFTBalanceOf,
  mockFetchNFTIdByIndex,
  mockFetchNFTClassMetadataById,
} = vi.hoisted(() => ({
  mockFetchTokenBookNFTsByAccount: vi.fn(),
  mockFetchNFTBalanceOf: vi.fn(),
  mockFetchNFTIdByIndex: vi.fn(),
  mockFetchNFTClassMetadataById: vi.fn(),
}))

mockNuxtImport('fetchTokenBookNFTsByAccount', () => mockFetchTokenBookNFTsByAccount)
mockNuxtImport('useUserSession', () => () => ({ loggedIn: ref(true) }))
mockNuxtImport('useBookSettingsStore', () => () => ({
  fetchBatchSettings: vi.fn(),
  getSettings: () => undefined,
}))
mockNuxtImport('useLikeNFTClassContract', () => () => ({
  fetchNFTBalanceOf: mockFetchNFTBalanceOf,
  fetchNFTIdByNFTClassIdAndWalletAddressAndIndex: mockFetchNFTIdByIndex,
  fetchNFTClassMetadataById: mockFetchNFTClassMetadataById,
}))

const WALLET = '0xwallet'
const BOOK = '0xbook'
const OTHER_BOOK = '0xother'

function makePage(rows: { address: string, token_id?: string }[], nextKey?: number) {
  return { data: rows, pagination: { next_key: nextKey } }
}

describe('bookshelf token IDs', () => {
  let store: ReturnType<typeof useBookshelfStore>

  beforeEach(() => {
    store = useBookshelfStore()
    store.reset()
    mockFetchTokenBookNFTsByAccount.mockReset()
    mockFetchNFTBalanceOf.mockReset()
    mockFetchNFTIdByIndex.mockReset()
    mockFetchNFTClassMetadataById.mockReset()
  })

  it('drops a persisted token ID the refresh no longer lists', async () => {
    // Left behind by an earlier session, before #22 was given away.
    store.tokenIdsByNFTClassId = { [BOOK]: ['22', '0'] }

    mockFetchTokenBookNFTsByAccount.mockResolvedValueOnce(makePage([{ address: BOOK, token_id: '54' }]))
    await store.fetchItems({ walletAddress: WALLET, isRefresh: true })

    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual(['54'])
  })

  it('merges rows for the same class across pages of one refresh', async () => {
    store.tokenIdsByNFTClassId = { [BOOK]: ['22'] }

    mockFetchTokenBookNFTsByAccount
      .mockResolvedValueOnce(makePage([{ address: BOOK, token_id: '0' }], 2))
      .mockResolvedValueOnce(makePage([{ address: BOOK, token_id: '54' }]))
    await store.fetchItems({ walletAddress: WALLET, isRefresh: true, limit: 1 })
    await store.fetchItems({ walletAddress: WALLET, limit: 1 })

    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual(['0', '54'])
  })

  it('keeps the persisted list for a row without a token ID', async () => {
    store.tokenIdsByNFTClassId = { [BOOK]: ['54'] }

    mockFetchTokenBookNFTsByAccount.mockResolvedValueOnce(makePage([
      { address: BOOK },
      { address: OTHER_BOOK },
    ]))
    await store.fetchItems({ walletAddress: WALLET, isRefresh: true })

    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual(['54'])
    expect(store.tokenIdsByNFTClassId[OTHER_BOOK]).toEqual([])
  })

  it('replaces a refused token ID with the next known one', async () => {
    store.tokenIdsByNFTClassId = { [BOOK]: ['22', '54'] }

    const nextTokenId = await store.replaceStaleTokenId(BOOK, '22', WALLET)

    expect(nextTokenId).toBe('54')
    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual(['54'])
    expect(mockFetchNFTBalanceOf).not.toHaveBeenCalled()
  })

  it('asks the contract when no known token ID is left', async () => {
    store.nftClassIds = [BOOK]
    store.tokenIdsByNFTClassId = { [BOOK]: ['22'] }
    mockFetchNFTBalanceOf.mockResolvedValueOnce(3)
    mockFetchNFTIdByIndex.mockResolvedValueOnce('0')
    mockFetchNFTClassMetadataById.mockResolvedValueOnce({ '@type': 'Book' })

    const nextTokenId = await store.replaceStaleTokenId(BOOK, '22', WALLET)

    expect(nextTokenId).toBe('0')
    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual(['0'])
  })

  it('returns nothing when the wallet holds no copy any more', async () => {
    store.tokenIdsByNFTClassId = { [BOOK]: ['22'] }
    mockFetchNFTBalanceOf.mockResolvedValueOnce(0)

    const nextTokenId = await store.replaceStaleTokenId(BOOK, '22', WALLET)

    expect(nextTokenId).toBeUndefined()
    expect(store.getTokenIdsByNFTClassId(BOOK)).toEqual([])
  })
})
