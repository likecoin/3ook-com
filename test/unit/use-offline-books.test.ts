import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOfflineBooks } from '~/composables/use-offline-books'
import {
  getBookFileCacheKey,
  getBookFileCacheKeyPrefix,
  getBookFileCacheIndexKey,
  isBookFileCacheKeyOfPrefix,
} from '~/utils/reader'

// The real value from nuxt.config's runtimeConfig — the composable reads it
// through useRuntimeConfig(), so the keys here are the ones shipped.
const CACHE_KEY_PREFIX = '3ook'

// Minimal CacheStorage: only keys()/delete() are exercised.
function stubCacheStorage(names: string[]) {
  const cacheNames = new Set(names)
  const stub = {
    keys: vi.fn(async () => [...cacheNames]),
    delete: vi.fn(async (name: string) => cacheNames.delete(name)),
  }
  vi.stubGlobal('caches', stub)
  return stub
}

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('getBookFileCacheKey', () => {
  it('matches the key the reader builds for an owned book', () => {
    expect(getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
      nftId: '7',
      fileIndex: '0',
      isCustomMessageEnabled: true,
    })).toBe('3ook-book-file-0xabc-7-0-1')
  })

  // The shelf passes contentURL.index as a number while the reader reads it
  // off the route as a string; both must land on the same cache.
  it('treats a numeric and string file index alike', () => {
    const asNumber = getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
      nftId: '7',
      fileIndex: 1,
    })
    const asString = getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
      nftId: '7',
      fileIndex: '1',
    })
    expect(asNumber).toBe(asString)
  })

  // reader.vue canonicalizes nft_class_id to lowercase before loading, so the
  // shelf must normalize too or the badge would never match.
  it('normalizes the NFT class id to lowercase', () => {
    expect(getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xABC',
      nftId: '7',
    })).toBe('3ook-book-file-0xabc-7-0-0')
  })

  it('omits a missing nftId instead of writing undefined into the key', () => {
    expect(getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
    })).toBe('3ook-book-file-0xabc-0-0')
  })

  it('keeps a preview file in its own cache', () => {
    expect(getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
      isPreview: true,
    })).toBe('3ook-book-file-0xabc-0-0-preview')
  })

  it('keys uploaded books by id, untouched by case normalization', () => {
    expect(getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: 'AbC123',
      isUploadedBook: true,
    })).toBe('3ook-book-file-upload-AbC123')
  })
})

describe('isBookFileCacheKeyOfPrefix', () => {
  it('requires a segment boundary so a longer book id does not match', () => {
    const prefix = getBookFileCacheKeyPrefix({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: '0xabc',
    })
    expect(isBookFileCacheKeyOfPrefix('3ook-book-file-0xabc-7-0-1', prefix)).toBe(true)
    expect(isBookFileCacheKeyOfPrefix('3ook-book-file-0xabc', prefix)).toBe(true)
    expect(isBookFileCacheKeyOfPrefix('3ook-book-file-0xabcdef-7-0-1', prefix)).toBe(false)
  })
})

describe('useOfflineBooks', () => {
  it('collects only this app\'s book file caches', async () => {
    stubCacheStorage([
      '3ook-book-file-0xabc-7-0-1',
      '3ook-book-file-upload-xyz',
      '3ook-tts-config',
      'nuxt-build-assets',
      'other-book-file-0xdef-1-0-0',
    ])

    const { offlineCacheKeys, refreshOfflineBooks } = useOfflineBooks()
    await refreshOfflineBooks()

    expect([...offlineCacheKeys.value].sort()).toEqual([
      '3ook-book-file-0xabc-7-0-1',
      '3ook-book-file-upload-xyz',
    ])
  })

  it('leaves the set empty when CacheStorage throws', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => {
        throw new Error('denied')
      }),
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { offlineCacheKeys, refreshOfflineBooks } = useOfflineBooks()
    await refreshOfflineBooks()

    expect(offlineCacheKeys.value.size).toBe(0)
  })

  it('deletes every cached variant of one book and no other book', async () => {
    const cacheStorage = stubCacheStorage([
      '3ook-book-file-0xabc-7-0-1',
      '3ook-book-file-0xabc-7-1-0',
      '3ook-book-file-0xabc-0-0-preview',
      '3ook-book-file-0xabcdef-1-0-0',
      '3ook-book-file-upload-xyz',
    ])

    const { offlineCacheKeys, refreshOfflineBooks, removeOfflineBook } = useOfflineBooks()
    await refreshOfflineBooks()
    await removeOfflineBook({ nftClassId: '0xABC' })

    expect(cacheStorage.delete.mock.calls.map(([name]) => name).sort()).toEqual([
      '3ook-book-file-0xabc-0-0-preview',
      '3ook-book-file-0xabc-7-0-1',
      '3ook-book-file-0xabc-7-1-0',
    ])
    expect([...offlineCacheKeys.value].sort()).toEqual([
      '3ook-book-file-0xabcdef-1-0-0',
      '3ook-book-file-upload-xyz',
    ])
  })

  it('deletes an uploaded book by its own key shape', async () => {
    const cacheStorage = stubCacheStorage([
      '3ook-book-file-upload-xyz',
      '3ook-book-file-0xabc-7-0-1',
    ])

    const { removeOfflineBook } = useOfflineBooks()
    await removeOfflineBook({ nftClassId: 'xyz', isUploadedBook: true })

    expect(cacheStorage.delete).toHaveBeenCalledExactlyOnceWith('3ook-book-file-upload-xyz')
  })

  // A stale index entry keeps counting against the LRU byte budget, which
  // would evict live books early.
  it('drops the deleted caches from the LRU index', async () => {
    stubCacheStorage(['3ook-book-file-0xabc-7-0-1', '3ook-book-file-0xdef-1-0-0'])
    const indexKey = getBookFileCacheIndexKey(CACHE_KEY_PREFIX)
    localStorage.setItem(indexKey, JSON.stringify({
      '3ook-book-file-0xabc-7-0-1': { size: 100, lastOpened: 1 },
      '3ook-book-file-0xdef-1-0-0': { size: 200, lastOpened: 2 },
    }))

    const { removeOfflineBook } = useOfflineBooks()
    await removeOfflineBook({ nftClassId: '0xabc' })

    expect(JSON.parse(localStorage.getItem(indexKey)!)).toEqual({
      '3ook-book-file-0xdef-1-0-0': { size: 200, lastOpened: 2 },
    })
  })

  it('does nothing when the book has no cached file', async () => {
    const cacheStorage = stubCacheStorage(['3ook-book-file-0xdef-1-0-0'])

    const { removeOfflineBook } = useOfflineBooks()
    await removeOfflineBook({ nftClassId: '0xabc' })

    expect(cacheStorage.delete).not.toHaveBeenCalled()
  })
})
