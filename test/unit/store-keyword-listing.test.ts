import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'

import { StoreKeywordQuerySchema } from '~~/server/schemas/store'
import { BUILT_IN_LIST_PATHS, fetchBookstoreBookListing } from '~~/server/utils/bookstore'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

vi.mock('~~/shared/utils/api', () => ({ getLikeCoinAPIFetch: () => mockFetch }))

describe('StoreKeywordQuerySchema', () => {
  it.each([
    ['絕版重生', '絕版重生'],
    [' #絕版重生 ', '絕版重生'],
    ['##絕版重生', '絕版重生'],
  ])('normalizes %j to the bare keyword', (keyword, expected) => {
    expect(v.parse(StoreKeywordQuerySchema, { keyword }).keyword).toBe(expected)
  })

  it('takes the first of repeated keywords', () => {
    expect(v.parse(StoreKeywordQuerySchema, { keyword: ['絕版重生', '小說'] }).keyword).toBe('絕版重生')
  })

  it.each([undefined, '', ' # '])('rejects a missing or blank keyword (%j)', (keyword) => {
    expect(v.safeParse(StoreKeywordQuerySchema, { keyword }).success).toBe(false)
  })
})

describe('fetchBookstoreBookListing keyword', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ list: [{ classId: '0xa', name: 'Book' }], nextKey: 1000 })
  })

  it('narrows the upstream list to the keyword', async () => {
    const result = await fetchBookstoreBookListing(BUILT_IN_LIST_PATHS.latest, {
      keyword: '絕版重生',
      nextKey: '2000',
      isLibrary: true,
    })
    expect(mockFetch).toHaveBeenCalledWith('/likernft/book/store/list', {
      query: expect.objectContaining({ keyword: '絕版重生', key: 2000, library: '1' }),
    })
    expect(result).toMatchObject({ records: [{ classId: '0xa', title: 'Book' }], offset: '1000', hasMore: true })
  })

  it('sends no keyword for the unfiltered list', async () => {
    await fetchBookstoreBookListing(BUILT_IN_LIST_PATHS.latest)
    expect(mockFetch.mock.calls[0]?.[1].query.keyword).toBeUndefined()
  })
})
