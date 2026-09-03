import { beforeEach, describe, expect, it } from 'vitest'
import { createLRUCacheIndex } from '~/utils/lru-cache-index'

const PREFIX = 'test'
const TOUCH_INTERVAL_MS = 60 * 1000

function getIndexKey(cacheKeyPrefix: string) {
  return `${cacheKeyPrefix}-index`
}

const upsertingIndex = createLRUCacheIndex({
  getIndexKey,
  touchIntervalMs: TOUCH_INTERVAL_MS,
  shouldCreateMissingOnTouch: true,
})

const strictIndex = createLRUCacheIndex({
  getIndexKey,
  touchIntervalMs: TOUCH_INTERVAL_MS,
})

function readRaw() {
  return JSON.parse(window.localStorage.getItem(getIndexKey(PREFIX)) ?? '{}')
}

describe('createLRUCacheIndex', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns the updated index from record, so a sweep needs no second read', () => {
    const index = upsertingIndex.record({ cacheKeyPrefix: PREFIX, key: 'a', size: 10 })
    expect(index.a?.size).toBe(10)
    expect(readRaw().a.size).toBe(10)
  })

  // The one behavioural difference between the two indexes built on this
  // factory: the book index tracks what is cached, the TTS pin index tracks
  // what was deliberately kept, and a touch must never confuse the two.
  it('upserts a missing key only when the index opted in', () => {
    upsertingIndex.touch({ cacheKeyPrefix: PREFIX, key: 'ghost' })
    expect(readRaw().ghost).toEqual({ size: 0, lastOpened: expect.any(Number) })

    window.localStorage.clear()
    strictIndex.touch({ cacheKeyPrefix: PREFIX, key: 'ghost' })
    expect(readRaw().ghost).toBeUndefined()
  })

  it('keeps the recorded size when touching an entry that exists', () => {
    upsertingIndex.record({ cacheKeyPrefix: PREFIX, key: 'a', size: 10 })
    window.localStorage.setItem(getIndexKey(PREFIX), JSON.stringify({
      a: { size: 10, lastOpened: 1 },
    }))
    strictIndex.touch({ cacheKeyPrefix: PREFIX, key: 'a' })
    expect(readRaw().a.size).toBe(10)
    expect(readRaw().a.lastOpened).toBeGreaterThan(1)
  })

  it('skips a recency write inside the touch interval', () => {
    upsertingIndex.record({ cacheKeyPrefix: PREFIX, key: 'a', size: 10 })
    const { lastOpened } = readRaw().a
    upsertingIndex.touch({ cacheKeyPrefix: PREFIX, key: 'a' })
    expect(readRaw().a.lastOpened).toBe(lastOpened)
  })

  it('removes only the named keys', () => {
    upsertingIndex.record({ cacheKeyPrefix: PREFIX, key: 'a', size: 1 })
    upsertingIndex.record({ cacheKeyPrefix: PREFIX, key: 'b', size: 2 })
    upsertingIndex.remove({ cacheKeyPrefix: PREFIX, keys: ['a'] })
    expect(Object.keys(readRaw())).toEqual(['b'])
  })

  // One NaN size would make an eviction total NaN and silently disable the
  // sweep this index exists to support.
  it('drops entries with non-finite numbers rather than propagating NaN', () => {
    window.localStorage.setItem(getIndexKey(PREFIX), JSON.stringify({
      good: { size: 1, lastOpened: 1 },
      bad: { size: 'x', lastOpened: 1 },
      alsoBad: { size: 1 },
      notAnObject: 5,
    }))
    expect(strictIndex.read(PREFIX)).toEqual({ good: { size: 1, lastOpened: 1 } })
  })

  it('survives malformed JSON and non-object payloads', () => {
    window.localStorage.setItem(getIndexKey(PREFIX), '{ not json')
    expect(strictIndex.read(PREFIX)).toEqual({})
    window.localStorage.setItem(getIndexKey(PREFIX), '[1,2]')
    expect(strictIndex.read(PREFIX)).toEqual({})
  })
})
