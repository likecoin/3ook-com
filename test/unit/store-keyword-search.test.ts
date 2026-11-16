import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import { useBookstoreStore } from '~/stores/bookstore'

const { mockFetchByKeyword, mockFetchBySearchTerm, mockPrefetch } = vi.hoisted(() => ({
  mockFetchByKeyword: vi.fn(),
  mockFetchBySearchTerm: vi.fn(),
  mockPrefetch: vi.fn(),
}))

mockNuxtImport('fetchBookstoreCMSPublicationsByKeyword', () => mockFetchByKeyword)
mockNuxtImport('fetchBookstoreCMSPublicationsBySearchTerm', () => mockFetchBySearchTerm)
mockNuxtImport('prefetchBookstoreInfo', () => mockPrefetch)

const KEYWORD = '絕版重生'

function makePage(classIds: string[], offset?: string) {
  return {
    records: classIds.map(classId => ({ id: classId, classId, title: `Book ${classId}`, imageUrl: 'https://example.com/cover.jpg', isDRMFree: false })),
    offset,
    hasMore: !!offset,
  }
}

describe('keyword search results', () => {
  let store: ReturnType<typeof useBookstoreStore>

  function getClassIds(isLibrary = false) {
    const key = `${isLibrary ? 'library:' : ''}keyword:${KEYWORD}`
    return store.bookstoreSearchResultsByQueryMap[key]?.items.map(item => item.classId)
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBookstoreStore()
    mockFetchByKeyword.mockReset()
    mockFetchBySearchTerm.mockReset()
    mockPrefetch.mockReset()
  })

  it('lists the keyword listing and pages on its cursor', async () => {
    mockFetchByKeyword
      .mockResolvedValueOnce(makePage(['0xa', '0xb'], '1000'))
      .mockResolvedValueOnce(makePage(['0xc']))

    await store.fetchSearchResults('keyword', KEYWORD, { isRefresh: true })
    await store.fetchSearchResults('keyword', KEYWORD)

    expect(mockFetchByKeyword).toHaveBeenNthCalledWith(1, KEYWORD, expect.objectContaining({ offset: undefined, isLibrary: false }))
    expect(mockFetchByKeyword).toHaveBeenNthCalledWith(2, KEYWORD, expect.objectContaining({ offset: '1000' }))
    expect(getClassIds()).toEqual(['0xa', '0xb', '0xc'])
    expect(mockFetchBySearchTerm).not.toHaveBeenCalled()
  })

  it('keeps library results apart from the store', async () => {
    mockFetchByKeyword.mockResolvedValueOnce(makePage(['0xa']))

    await store.fetchSearchResults('keyword', KEYWORD, { isLibrary: true })

    expect(mockFetchByKeyword).toHaveBeenCalledWith(KEYWORD, expect.objectContaining({ isLibrary: true }))
    expect(getClassIds(true)).toEqual(['0xa'])
    expect(getClassIds()).toBeUndefined()
  })

  it('leaves the text search on its own endpoint', async () => {
    mockFetchBySearchTerm.mockResolvedValueOnce(makePage(['0xa']))

    await store.fetchSearchResults('q', KEYWORD)

    expect(mockFetchBySearchTerm).toHaveBeenCalledWith(KEYWORD, expect.anything())
    expect(mockFetchByKeyword).not.toHaveBeenCalled()
  })
})
