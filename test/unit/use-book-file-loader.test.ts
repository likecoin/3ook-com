import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import useBookFileLoader from '~/composables/use-book-file-loader'
import { CUSTOM_MESSAGE_PENDING_HEADER } from '~~/shared/utils/book-file'

mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useUserSession', () => () => ({ user: ref(null) }))

const URL_WITH_MESSAGE = 'https://api.example.com/ebook-cors/?class_id=0xabc&nft_id=7&index=0&custom_message=1'
const CACHE_KEY = '3ook-book-file-0xabc-7-0-1'

interface StoredEntry {
  body: ArrayBuffer
  init: ResponseInit
}

// CacheStorage keeping each body as bytes, so a hit can be served repeatedly.
function stubCacheStorage() {
  const stores = new Map<string, Map<string, StoredEntry>>()
  const open = vi.fn(async (name: string) => {
    let store = stores.get(name)
    if (!store) {
      store = new Map()
      stores.set(name, store)
    }
    const entries = store
    return {
      match: vi.fn(async (req: Request) => {
        const entry = entries.get(req.url)
        return entry ? new Response(entry.body.slice(0), entry.init) : undefined
      }),
      put: vi.fn(async (req: Request, res: Response) => {
        const headers = Object.fromEntries(res.headers.entries())
        entries.set(req.url, { body: await res.arrayBuffer(), init: { status: res.status, headers } })
      }),
    }
  })
  vi.stubGlobal('caches', {
    open,
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  })
  return {
    getEntry: (name: string, url: string) => stores.get(name)?.get(url),
    setEntry: (name: string, url: string, entry: StoredEntry) => {
      stores.set(name, new Map([[url, entry]]))
    },
  }
}

function stubFetch(headers: Record<string, string> = {}) {
  const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubOnline(isOnline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)
}

const legacyEntry: StoredEntry = { body: new Uint8Array([9]).buffer, init: { status: 200 } }

beforeEach(() => {
  localStorage.clear()
  stubOnline(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useBookFileLoader custom message caching', () => {
  it('refetches a copy cached while its custom message page was pending', async () => {
    const cacheStorage = stubCacheStorage()
    const fetchMock = stubFetch({ [CUSTOM_MESSAGE_PENDING_HEADER]: '1' })
    const { loadFileAsBuffer, isLoadedFromCache } = useBookFileLoader()
    const options = { cacheKey: CACHE_KEY, isCustomMessageEnabled: true }

    const buffer = await loadFileAsBuffer(URL_WITH_MESSAGE, options)
    expect(new Uint8Array(buffer!)).toEqual(new Uint8Array([1, 2, 3]))
    await vi.waitFor(() => expect(cacheStorage.getEntry(CACHE_KEY, URL_WITH_MESSAGE)).toBeDefined())

    await loadFileAsBuffer(URL_WITH_MESSAGE, options)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(isLoadedFromCache.value).toBe(false)
  })

  it('reads a copy with its custom message page from the cache', async () => {
    const cacheStorage = stubCacheStorage()
    const fetchMock = stubFetch()
    const { loadFileAsBuffer, isLoadedFromCache } = useBookFileLoader()
    const options = { cacheKey: CACHE_KEY, isCustomMessageEnabled: true }

    await loadFileAsBuffer(URL_WITH_MESSAGE, options)
    await vi.waitFor(() => expect(cacheStorage.getEntry(CACHE_KEY, URL_WITH_MESSAGE)).toBeDefined())

    const buffer = await loadFileAsBuffer(URL_WITH_MESSAGE, options)
    expect(new Uint8Array(buffer!)).toEqual(new Uint8Array([1, 2, 3]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(isLoadedFromCache.value).toBe(true)
  })

  it('refetches a custom message copy cached before the ready stamp existed', async () => {
    const cacheStorage = stubCacheStorage()
    cacheStorage.setEntry(CACHE_KEY, URL_WITH_MESSAGE, legacyEntry)
    const fetchMock = stubFetch()
    const { loadFileAsBuffer } = useBookFileLoader()

    const buffer = await loadFileAsBuffer(URL_WITH_MESSAGE, { cacheKey: CACHE_KEY, isCustomMessageEnabled: true })
    expect(new Uint8Array(buffer!)).toEqual(new Uint8Array([1, 2, 3]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(cacheStorage.getEntry(CACHE_KEY, URL_WITH_MESSAGE)?.body.byteLength).toBe(3))
  })

  it('still reads a copy lacking its custom message page while offline', async () => {
    stubOnline(false)
    const cacheStorage = stubCacheStorage()
    cacheStorage.setEntry(CACHE_KEY, URL_WITH_MESSAGE, legacyEntry)
    const fetchMock = stubFetch()
    const { loadFileAsBuffer, isLoadedFromCache } = useBookFileLoader()

    const buffer = await loadFileAsBuffer(URL_WITH_MESSAGE, { cacheKey: CACHE_KEY, isCustomMessageEnabled: true })
    expect(new Uint8Array(buffer!)).toEqual(new Uint8Array([9]))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isLoadedFromCache.value).toBe(true)
  })

  it('keeps reading an old cached copy of a book without a custom message page', async () => {
    const url = 'https://api.example.com/ebook-cors/?class_id=0xabc&nft_id=7&index=0&custom_message=0'
    const cacheKey = '3ook-book-file-0xabc-7-0-0'
    const cacheStorage = stubCacheStorage()
    cacheStorage.setEntry(cacheKey, url, legacyEntry)
    const fetchMock = stubFetch()
    const { loadFileAsBuffer } = useBookFileLoader()

    const buffer = await loadFileAsBuffer(url, { cacheKey })
    expect(new Uint8Array(buffer!)).toEqual(new Uint8Array([9]))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
