// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

import {
  AIRTABLE_OFFSET_STORAGE_BASE,
  AIRTABLE_OFFSET_TTL_MS,
  AIRTABLE_RECORDS_TTL_MS,
  AIRTABLE_STORAGE_BASE,
  SERVER_CACHE_STORAGE,
  SITEMAP_STORAGE_BASE,
  SITEMAP_TTL_MS,
} from '~~/shared/constants/server-cache'

// Short enough to await for real; fake timers would not reach lru-cache's
// internal clock.
const TEST_TTL = 30

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('server cache storage mounts', () => {
  // Every mount must declare a driver that honours ttl. The memory driver
  // silently drops it, so a missing or defaulted mount reinstates the exact
  // bug this module exists to prevent.
  it.each([
    [AIRTABLE_STORAGE_BASE, AIRTABLE_RECORDS_TTL_MS],
    [AIRTABLE_OFFSET_STORAGE_BASE, AIRTABLE_OFFSET_TTL_MS],
    [SITEMAP_STORAGE_BASE, SITEMAP_TTL_MS],
  ])('mounts %s on lru-cache with an explicit ttl', (base, expectedTTL) => {
    const mount = SERVER_CACHE_STORAGE[base as keyof typeof SERVER_CACHE_STORAGE]

    expect(mount).toBeDefined()
    expect(mount.driver).toBe('lruCache')
    expect(mount.ttl).toBe(expectedTTL)
    expect(mount.max).toBeGreaterThan(0)
  })

  it('expires offsets well before records, so a stale cursor refreshes first', () => {
    expect(AIRTABLE_OFFSET_TTL_MS).toBeLessThan(AIRTABLE_RECORDS_TTL_MS)
    // Airtable invalidates offsets at ~5 minutes.
    expect(AIRTABLE_OFFSET_TTL_MS).toBeLessThan(5 * 60 * 1000)
  })

  // @nuxtjs/sitemap writes its own runtime cache to the bare `sitemap` mount.
  it('does not name a mount the sitemap module would overwrite', () => {
    expect(SERVER_CACHE_STORAGE).not.toHaveProperty('sitemap')
  })

  // maxSize makes lru-cache demand a sizeCalculation, which the unstorage
  // driver supplies whenever maxSize is set. This pins that behaviour, since
  // losing it would throw on the first write and only surface in production.
  it.each(Object.keys(SERVER_CACHE_STORAGE))('round-trips a value through the real %s options', async (base) => {
    const { driver: _driver, ...driverOptions } = SERVER_CACHE_STORAGE[base as keyof typeof SERVER_CACHE_STORAGE]
    const storage = createStorage({ driver: lruCacheDriver(driverOptions) })

    await storage.setItem('genre:fiction:records', { records: [{ id: 'rec1' }], hasMore: true })

    expect(await storage.getItem('genre:fiction:records')).toEqual({ records: [{ id: 'rec1' }], hasMore: true })
  })

  it('evicts an entry once its ttl elapses', async () => {
    const storage = createStorage({ driver: lruCacheDriver({ max: 10, ttl: TEST_TTL }) })

    await storage.setItem('genre:fiction:offset', 'itrXYZ')
    expect(await storage.getItem('genre:fiction:offset')).toBe('itrXYZ')

    await wait(TEST_TTL * 2)
    expect(await storage.getItem('genre:fiction:offset')).toBeNull()
  })

  it('caps entry count so search-term keys cannot grow unbounded', async () => {
    const max = 3
    const storage = createStorage({ driver: lruCacheDriver({ max }) })

    for (let i = 0; i < max + 2; i++) {
      await storage.setItem(`search:keyword-${i}:records`, [i])
    }

    expect((await storage.getKeys()).length).toBe(max)
    expect(await storage.getItem('search:keyword-0:records')).toBeNull()
    expect(await storage.getItem('search:keyword-4:records')).toEqual([4])
  })
})
