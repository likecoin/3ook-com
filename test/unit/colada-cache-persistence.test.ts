import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PiniaColadaPluginContext } from '@pinia/colada'
import { useQueryCache } from '@pinia/colada'
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'

import { createCachePersisterOptions } from '~~/colada.options'

const STORAGE_KEY = '3ook-query-cache'

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    dump: () => map.get(STORAGE_KEY),
  }
}

describe('colada cache persistence', () => {
  let queryCache: ReturnType<typeof useQueryCache>

  function installPersister(storage: ReturnType<typeof createMemoryStorage>) {
    PiniaColadaCachePersister(createCachePersisterOptions(storage))(
      { queryCache } as PiniaColadaPluginContext)
  }

  async function flushPersist(storage: ReturnType<typeof createMemoryStorage>) {
    // The plugin debounces persists by 300ms; poll until the write lands.
    await vi.waitFor(() => {
      if (!storage.dump()) throw new Error('not persisted yet')
    }, { timeout: 2000, interval: 25 })
  }

  beforeEach(() => {
    queryCache = useQueryCache()
    queryCache.getEntries().forEach(entry => queryCache.remove(entry))
  })

  it('persists only allowlisted query roots, versioned', async () => {
    const storage = createMemoryStorage()
    installPersister(storage)

    queryCache.setQueryData(['nft-class', '0xabc'], { address: '0xabc', metadata: { name: 'Book' } })
    queryCache.setQueryData(['bookstore-info', '0xabc'], { name: 'Book', isHidden: false })
    queryCache.setQueryData(['liker-info', 'id', 'alice'], { likerId: 'alice' })
    await flushPersist(storage)

    const stored = storage.dump()
    expect(stored).toMatch(/^v2\|/)
    expect(stored).toContain('nft-class')
    expect(stored).toContain('bookstore-info')
    expect(stored).not.toContain('liker-info')
  })

  it('restores persisted entries on a fresh install', async () => {
    const storage = createMemoryStorage()
    installPersister(storage)
    queryCache.setQueryData(['nft-class', '0xabc'], { address: '0xabc', metadata: { name: 'Book' } })
    await flushPersist(storage)

    queryCache.getEntries().forEach(entry => queryCache.remove(entry))
    expect(queryCache.getQueryData(['nft-class', '0xabc'])).toBeUndefined()

    installPersister(storage)
    expect(queryCache.getQueryData(['nft-class', '0xabc']))
      .toEqual({ address: '0xabc', metadata: { name: 'Book' } })
    // Restored entries carry no options, so they are never garbage-collected.
    expect(queryCache.get(['nft-class', '0xabc'])?.options).toBeFalsy()
  })

  it('discards corrupted storage without crashing', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: 'v2|{not json' })

    expect(() => installPersister(storage)).not.toThrow()
    expect(queryCache.getEntries()).toHaveLength(0)
  })

  it('discards storage written with a different cache version', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: 'v0|{"[\\"nft-class\\",\\"0xabc\\"]":[{"name":"stale"}]}',
    })

    expect(() => installPersister(storage)).not.toThrow()
    expect(queryCache.getQueryData(['nft-class', '0xabc'])).toBeUndefined()
  })

  it('caps persisted entries per root, keeping the most recently resolved', () => {
    const options = createCachePersisterOptions(createMemoryStorage())
    const cache: Record<string, unknown> = {}
    // Serialized entries are [data, error, age, meta]; lower age = fresher.
    for (let i = 0; i < 350; i++) {
      cache[JSON.stringify(['nft-class', `0x${i}`])] = [{ address: `0x${i}` }, null, i, {}]
    }
    cache[JSON.stringify(['cms-tags'])] = [[], null, 9999, {}]

    const stored = JSON.parse(options.stringify!(cache as never).slice(3))
    const keys = Object.keys(stored)
    expect(keys.filter(k => k.includes('nft-class'))).toHaveLength(300)
    // The freshest survives; the oldest is dropped.
    expect(stored[JSON.stringify(['nft-class', '0x0'])]).toBeDefined()
    expect(stored[JSON.stringify(['nft-class', '0x349'])]).toBeUndefined()
    // Uncapped roots pass through even when stale.
    expect(stored[JSON.stringify(['cms-tags'])]).toBeDefined()
  })
})
