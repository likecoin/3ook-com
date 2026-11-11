import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { fetchAllNFTClassesByOwnerWalletAddress } from '~~/shared/utils/indexer'

const { mockIndexerFetch } = vi.hoisted(() => ({
  mockIndexerFetch: vi.fn(),
}))

mockNuxtImport('createRetryingFetch', () => () => mockIndexerFetch)

const WALLET = '0x089519f336825608EaBbdb2d81138E8A0d1613F2'
const PAGE_SIZE = 500

function makePage(prefix: string, count: number, nextKey: number) {
  return {
    data: Array.from({ length: count }, (_, index) => ({ address: `${prefix}${index}` })),
    pagination: { next_key: nextKey, count },
  }
}

function getRequestedCursors() {
  return mockIndexerFetch.mock.calls.map(([, options]) => options.query['pagination.key'])
}

describe('fetchAllNFTClassesByOwnerWalletAddress', () => {
  beforeEach(() => {
    mockIndexerFetch.mockReset()
  })

  it('follows the cursor across pages for a catalogue over one page', async () => {
    mockIndexerFetch
      .mockResolvedValueOnce(makePage('a', PAGE_SIZE, 11))
      .mockResolvedValueOnce(makePage('b', 20, 22))

    const classes = await fetchAllNFTClassesByOwnerWalletAddress(WALLET)

    expect(classes).toHaveLength(PAGE_SIZE + 20)
    expect(classes.at(-1)?.address).toBe('b19')
    expect(getRequestedCursors()).toEqual([undefined, '11'])
    expect(mockIndexerFetch.mock.calls[0]?.[0]).toBe(`/account/${WALLET}/booknfts`)
  })

  it('stops on a full last page reported with next_key 0', async () => {
    mockIndexerFetch.mockResolvedValueOnce(makePage('a', PAGE_SIZE, 0))

    const classes = await fetchAllNFTClassesByOwnerWalletAddress(WALLET)

    expect(classes).toHaveLength(PAGE_SIZE)
    expect(getRequestedCursors()).toEqual([undefined])
  })

  it('stops when the cursor cycles back to a visited page', async () => {
    mockIndexerFetch
      .mockResolvedValueOnce(makePage('a', PAGE_SIZE, 11))
      .mockResolvedValueOnce(makePage('b', PAGE_SIZE, 22))
      .mockResolvedValueOnce(makePage('c', PAGE_SIZE, 11))

    const classes = await fetchAllNFTClassesByOwnerWalletAddress(WALLET)

    expect(classes).toHaveLength(PAGE_SIZE * 3)
    expect(getRequestedCursors()).toEqual([undefined, '11', '22'])
  })
})
