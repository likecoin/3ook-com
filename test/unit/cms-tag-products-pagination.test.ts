import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import { useBookstoreStore } from '~/stores/bookstore'

const { mockFetchBookstoreCMSProductsByTagId } = vi.hoisted(() => ({
  mockFetchBookstoreCMSProductsByTagId: vi.fn(),
}))

mockNuxtImport('fetchBookstoreCMSProductsByTagId', () => mockFetchBookstoreCMSProductsByTagId)

const TAG_ID = 'literature'

function makePage(classIds: string[], offset?: string) {
  return {
    records: classIds.map(classId => ({ id: classId, classId, isDRMFree: false })),
    offset,
    hasMore: !!offset,
  }
}

function getClassIds(store: ReturnType<typeof useBookstoreStore>) {
  return store.getBookstoreCMSProductsByTagId(TAG_ID).items.map(item => item.classId)
}

describe('fetchCMSProductsByTagId pagination', () => {
  let store: ReturnType<typeof useBookstoreStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBookstoreStore()
    mockFetchBookstoreCMSProductsByTagId.mockReset()
  })

  it('drops a book already shown on an earlier page', async () => {
    mockFetchBookstoreCMSProductsByTagId
      .mockResolvedValueOnce(makePage(['0xa', '0xb', '0xc'], '3'))
      // 0xa repeats: the tag was reordered and this page came from a stale cache.
      .mockResolvedValueOnce(makePage(['0xd', '0xa', '0xe']))

    await store.fetchCMSProductsByTagId(TAG_ID)
    await store.fetchCMSProductsByTagId(TAG_ID)

    expect(getClassIds(store)).toEqual(['0xa', '0xb', '0xc', '0xd', '0xe'])
  })

  it('does not refetch page 1 once the last page has loaded', async () => {
    mockFetchBookstoreCMSProductsByTagId.mockResolvedValue(makePage(['0xa', '0xb', '0xc']))

    await store.fetchCMSProductsByTagId(TAG_ID)
    // A stray load-more, e.g. from a remount after a locale redirect.
    await store.fetchCMSProductsByTagId(TAG_ID)

    expect(mockFetchBookstoreCMSProductsByTagId).toHaveBeenCalledTimes(1)
    expect(getClassIds(store)).toEqual(['0xa', '0xb', '0xc'])
  })

  it('retries page 1 after it failed', async () => {
    mockFetchBookstoreCMSProductsByTagId
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(makePage(['0xa', '0xb', '0xc']))

    await expect(store.fetchCMSProductsByTagId(TAG_ID)).rejects.toThrow('network')
    await store.fetchCMSProductsByTagId(TAG_ID)

    expect(getClassIds(store)).toEqual(['0xa', '0xb', '0xc'])
  })

  it('refetches page 1 on refresh after the last page has loaded', async () => {
    mockFetchBookstoreCMSProductsByTagId
      .mockResolvedValueOnce(makePage(['0xa', '0xb', '0xc']))
      .mockResolvedValueOnce(makePage(['0xb', '0xa']))

    await store.fetchCMSProductsByTagId(TAG_ID)
    await store.fetchCMSProductsByTagId(TAG_ID, { isRefresh: true })

    expect(getClassIds(store)).toEqual(['0xb', '0xa'])
  })
})
