import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'

import {
  fetchBookstoreCMSTagThroughCache,
  fetchBookstoreCMSTagsThroughCache,
  getBookstoreCMSTagByIdFromCache,
  getBookstoreCMSTagsFromCache,
  getHasFetchedBookstoreCMSTagsFromCache,
} from '~/composables/use-bookstore-cms-tags'

const { mockFetchTags, mockFetchTagById } = vi.hoisted(() => ({
  mockFetchTags: vi.fn(),
  mockFetchTagById: vi.fn(),
}))

mockNuxtImport('fetchBookstoreCMSTagsForAll', () => mockFetchTags)
mockNuxtImport('fetchBookstoreCMSTagById', () => mockFetchTagById)

function makeTag(overrides: Partial<BookstoreCMSTag> & Pick<BookstoreCMSTag, 'id'>): BookstoreCMSTag {
  return {
    name: { zh: '', en: '' },
    description: { zh: '', en: '' },
    isPublic: true,
    isForLibrary: false,
    isForStore: true,
    isConditional: false,
    ...overrides,
  }
}

const tags: BookstoreCMSTag[] = [
  makeTag({ id: 'latest', name: { zh: '最新', en: 'Latest' } }),
  makeTag({ id: 'featured', name: { zh: '精選', en: 'Featured' }, isConditional: true }),
]

describe('use-bookstore-cms-tags', () => {
  let queryCache: ReturnType<typeof useQueryCache>

  beforeEach(() => {
    queryCache = useQueryCache()
    queryCache.getEntries().forEach(entry => queryCache.remove(entry))
    mockFetchTags.mockReset()
    mockFetchTagById.mockReset()
  })

  it('stores the ordered tag list whole and seeds per-tag entries', async () => {
    mockFetchTags.mockResolvedValue({ records: tags })

    expect(getHasFetchedBookstoreCMSTagsFromCache(queryCache)).toBe(false)
    const result = await fetchBookstoreCMSTagsThroughCache(queryCache)

    expect(result).toEqual(tags)
    expect(getBookstoreCMSTagsFromCache(queryCache)).toEqual(tags)
    expect(getHasFetchedBookstoreCMSTagsFromCache(queryCache)).toBe(true)
    expect(getBookstoreCMSTagByIdFromCache(queryCache, 'featured')).toEqual(tags[1])
    expect(mockFetchTagById).not.toHaveBeenCalled()
  })

  it('refetches the list on every explicit fetch but dedupes concurrent calls', async () => {
    mockFetchTags.mockResolvedValue({ records: tags })

    await Promise.all([
      fetchBookstoreCMSTagsThroughCache(queryCache),
      fetchBookstoreCMSTagsThroughCache(queryCache),
    ])
    expect(mockFetchTags).toHaveBeenCalledTimes(1)

    await fetchBookstoreCMSTagsThroughCache(queryCache)
    expect(mockFetchTags).toHaveBeenCalledTimes(2)
  })

  it('fetches a single tag absent from the list once per session', async () => {
    const hiddenTag = makeTag({ id: 'hidden', name: { zh: '隱', en: 'Hidden' }, isPublic: false })
    mockFetchTagById.mockResolvedValue(hiddenTag)

    const first = await fetchBookstoreCMSTagThroughCache(queryCache, 'hidden')
    const second = await fetchBookstoreCMSTagThroughCache(queryCache, 'hidden')

    expect(first).toEqual(hiddenTag)
    expect(second).toEqual(hiddenTag)
    expect(mockFetchTagById).toHaveBeenCalledTimes(1)
    expect(getBookstoreCMSTagByIdFromCache(queryCache, 'hidden')).toEqual(hiddenTag)
    // A directly-fetched tag does not join the ordered list; the tag bar
    // surfaces the active tag separately when it's absent from the list.
    expect(getBookstoreCMSTagsFromCache(queryCache)).toEqual([])
  })

  it('rejects with the original fetcher error for unknown tags', async () => {
    const error = Object.assign(new Error('not found'), { statusCode: 404 })
    mockFetchTagById.mockRejectedValue(error)

    await expect(fetchBookstoreCMSTagThroughCache(queryCache, 'nope')).rejects.toBe(error)
  })
})
