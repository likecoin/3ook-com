import { afterEach, describe, expect, it, vi } from 'vitest'
// ?raw, not node:fs: the nuxt test environment stubs fs via unenv.
import nuxtConfigSource from '~~/nuxt.config.ts?raw'
import {
  SW_DEAD_END_URL,
  SW_DIAGNOSTICS_CACHE,
  clearSWDeadEnd,
  readSWDeadEnd,
} from '~/utils/sw-dead-end'
import type { SWDeadEnd } from '~/utils/sw-dead-end'

const VALID: SWDeadEnd = {
  at: 1_700_000_000_000,
  wasOnline: true,
  cacheKeysCount: 0,
  pathname: '/shelf',
  retry: 'ok',
}

// Minimal CacheStorage stub — the util reads via caches.match and clears via
// caches.open, so both entry points share one backing store.
function stubCaches() {
  const store = new Map<string, Response>()
  vi.stubGlobal('caches', {
    match: async (url: string) => store.get(url),
    open: async () => ({
      match: async (url: string) => store.get(url),
      put: async (url: string, response: Response) => void store.set(url, response),
      delete: async (url: string) => store.delete(url),
    }),
  })
  return store
}

function stubFailingCaches() {
  const fail = async () => {
    throw new Error('quota exceeded')
  }
  vi.stubGlobal('caches', { match: fail, open: fail })
}

function write(store: Map<string, Response>, payload: unknown) {
  store.set(SW_DEAD_END_URL, new Response(JSON.stringify(payload)))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readSWDeadEnd', () => {
  it('returns null when no breadcrumb was written', async () => {
    stubCaches()
    await expect(readSWDeadEnd()).resolves.toBeNull()
  })

  it('reads back a breadcrumb written by the service worker', async () => {
    const store = stubCaches()
    write(store, VALID)
    await expect(readSWDeadEnd()).resolves.toEqual(VALID)
  })

  it('keeps the breadcrumb so a failed report can retry on the next launch', async () => {
    const store = stubCaches()
    write(store, VALID)
    await readSWDeadEnd()
    expect(store.has(SW_DEAD_END_URL)).toBe(true)
  })

  it('drops a partial payload instead of reporting undefined params', async () => {
    const store = stubCaches()
    write(store, { at: VALID.at, pathname: '/shelf' })
    await expect(readSWDeadEnd()).resolves.toBeNull()
    expect(store.has(SW_DEAD_END_URL)).toBe(false)
  })

  it('drops an unparsable blob', async () => {
    const store = stubCaches()
    store.set(SW_DEAD_END_URL, new Response('not json'))
    await expect(readSWDeadEnd()).resolves.toBeNull()
    expect(store.has(SW_DEAD_END_URL)).toBe(false)
  })

  it('returns null when CacheStorage is unavailable', async () => {
    vi.stubGlobal('caches', undefined)
    await expect(readSWDeadEnd()).resolves.toBeNull()
  })

  it('gives up without a second round trip when storage throws', async () => {
    stubFailingCaches()
    await expect(readSWDeadEnd()).resolves.toBeNull()
  })
})

describe('clearSWDeadEnd', () => {
  it('removes the breadcrumb once the event is queued', async () => {
    const store = stubCaches()
    write(store, VALID)
    await clearSWDeadEnd()
    expect(store.has(SW_DEAD_END_URL)).toBe(false)
  })

  it('swallows storage errors', async () => {
    stubFailingCaches()
    await expect(clearSWDeadEnd()).resolves.toBeUndefined()
  })
})

describe('service worker handler', () => {
  // handlerDidError is serialized into sw.js via toString(), so it must inline
  // these literals rather than import them — keep both copies in sync.
  it('inlines the breadcrumb cache name and URL as literals', () => {
    expect(nuxtConfigSource).toContain(`'${SW_DIAGNOSTICS_CACHE}'`)
    expect(nuxtConfigSource).toContain(`'${SW_DEAD_END_URL}'`)
  })
})
