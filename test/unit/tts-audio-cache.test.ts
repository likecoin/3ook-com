import { beforeEach, describe, expect, it } from 'vitest'
import { TTS_AUDIO_CACHE } from '~~/shared/constants/tts-cache'
import {
  getTTSPinIdFromURL,
  getTTSPinIndexKey,
  markTTSPinInFlight,
  pruneTTSAudioCache,
  readTTSPinIndex,
  recordTTSPin,
  removeTTSPins,
  touchTTSPin,
} from '~/utils/tts-audio-cache'

const PREFIX = 'test'

// Mirrors TTS_SEGMENT_ESTIMATE_BYTES: the sweep counts entries rather than
// measuring them, so budgets in these tests are expressed in whole segments.
const SEGMENT = 30 * 1024

function buildSegmentURL({ nftClassId, language, voiceId, text }: {
  nftClassId: string
  language: string
  voiceId: string
  text: string
}) {
  return `https://3ook.com/api/reader/tts?text=${text}&language=${language}&voice_id=${voiceId}&nft_class_id=${nftClassId}&sig=x`
}

function buildSegmentURLs({ nftClassId, count }: { nftClassId: string, count: number }) {
  return Array.from({ length: count }, (_, index) => buildSegmentURL({
    nftClassId, language: 'zh-HK', voiceId: 'v', text: String(index),
  }))
}

/** Minimal CacheStorage stand-in: enough surface for the sweep's keys/delete. */
function installFakeCaches(urls: string[]) {
  const store = new Set<string>(urls)
  const cache = {
    keys: async () => [...store].map(url => new Request(url)),
    match: async () => undefined,
    delete: async (request: Request) => store.delete(request.url),
  }
  ;(window as unknown as { caches: unknown }).caches = { open: async () => cache }
  return store
}

describe('tts-audio-cache', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('getTTSPinIdFromURL', () => {
    it('derives a pin id from the segment URL query params', () => {
      expect(getTTSPinIdFromURL(buildSegmentURL({
        nftClassId: '0xABC', language: 'zh-HK', voiceId: 'phoebe_v28', text: 'a',
      }))).toBe('0xabc:zh-HK:phoebe_v28')
    })

    it('gives one book two pins across two voices', () => {
      const base = { nftClassId: '0xABC', language: 'zh-HK', text: 'a' }
      expect(getTTSPinIdFromURL(buildSegmentURL({ ...base, voiceId: 'phoebe_v28' })))
        .not.toBe(getTTSPinIdFromURL(buildSegmentURL({ ...base, voiceId: 'karenly' })))
    })

    it('survives the blocking param the Workbox cache key strips', () => {
      const withBlocking = `${buildSegmentURL({
        nftClassId: '0xABC', language: 'zh-HK', voiceId: 'v', text: 'a',
      })}&blocking=1`
      expect(getTTSPinIdFromURL(withBlocking)).toBe('0xabc:zh-HK:v')
    })

    it('returns undefined when the URL is not a TTS segment', () => {
      expect(getTTSPinIdFromURL('https://3ook.com/api/reader/tts?text=a')).toBeUndefined()
      expect(getTTSPinIdFromURL('not a url at all ://')).toBeUndefined()
    })
  })

  describe('pin index', () => {
    it('records and reads back a pin', () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'a:zh-HK:v', size: 100 })
      expect(readTTSPinIndex(PREFIX)['a:zh-HK:v']).toMatchObject({ size: 100 })
    })

    it('drops entries with a non-finite size so the sweep total cannot become NaN', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        good: { size: 10, lastOpened: 1 },
        bad: { size: 'x', lastOpened: 1 },
      }))
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['good'])
    })

    it('survives corrupt json', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), '{oops')
      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('does not bump recency within the touch interval', () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p', size: 1 })
      const before = readTTSPinIndex(PREFIX).p!.lastOpened
      touchTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p' })
      expect(readTTSPinIndex(PREFIX).p!.lastOpened).toBe(before)
    })

    it('bumps recency for a pin last opened long ago', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        p: { size: 1, lastOpened: 1 },
      }))
      touchTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p' })
      expect(readTTSPinIndex(PREFIX).p!.lastOpened).toBeGreaterThan(1)
    })
  })

  describe('pruneTTSAudioCache', () => {
    it('drops unpinned lookahead before touching any download', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const [loose] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([pinned!, loose!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 1.5 })

      expect(store.has(loose!)).toBe(false)
      expect(store.has(pinned!)).toBe(true)
      expect(readTTSPinIndex(PREFIX)['0xa:zh-HK:v']).toBeDefined()
    })

    it('evicts the least-recently-opened download and never the current one', async () => {
      const [old] = buildSegmentURLs({ nftClassId: '0xOLD', count: 1 })
      const [kept] = buildSegmentURLs({ nftClassId: '0xNEW', count: 1 })
      const store = installFakeCaches([old!, kept!])
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        '0xold:zh-HK:v': { size: SEGMENT, lastOpened: 1 },
        '0xnew:zh-HK:v': { size: SEGMENT, lastOpened: 2 },
      }))

      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 1.5, keepPinId: '0xnew:zh-HK:v',
      })

      expect(store.has(old!)).toBe(false)
      expect(store.has(kept!)).toBe(true)
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['0xnew:zh-HK:v'])
    })

    it('protects an in-flight download that has no index entry yet', async () => {
      const [indexed] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const inFlight = buildSegmentURLs({ nftClassId: '0xB', count: 2 })
      const store = installFakeCaches([indexed!, ...inFlight])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      // keepPinId is the in-flight pin, which recordTTSPin has not registered yet.
      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT, keepPinId: '0xb:zh-HK:v',
      })

      expect(inFlight.every(url => store.has(url))).toBe(true)
      expect(store.has(indexed!)).toBe(false)
    })

    it('protects a download in flight from a sweep started for another book', async () => {
      const [indexed] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const inFlight = buildSegmentURLs({ nftClassId: '0xB', count: 2 })
      const store = installFakeCaches([indexed!, ...inFlight])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })
      const release = markTTSPinInFlight('0xb:zh-HK:v')

      // keepPinId is a third book entirely — only the in-flight registry saves B.
      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT, keepPinId: '0xc:zh-HK:v',
      })
      release()

      expect(inFlight.every(url => store.has(url))).toBe(true)
      expect(store.has(indexed!)).toBe(false)
    })

    it('counts segments cached under a pin beyond its recorded download size', async () => {
      // Recorded as one segment, but ten are live — a partial download plus
      // ordinary listening. Budgeting on the record alone would see 1/10th.
      const urls = buildSegmentURLs({ nftClassId: '0xA', count: 10 })
      const store = installFakeCaches(urls)
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 4 })

      expect(store.size).toBe(0)
      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('stops evicting once the freed bytes bring it under budget', async () => {
      // The oldest pin holds ten live segments though it recorded one. Freeing it
      // is enough; crediting only the recorded size would evict the newer pin too.
      const old = buildSegmentURLs({ nftClassId: '0xOLD', count: 10 })
      const [mid] = buildSegmentURLs({ nftClassId: '0xMID', count: 1 })
      const [kept] = buildSegmentURLs({ nftClassId: '0xNEW', count: 1 })
      const store = installFakeCaches([...old, mid!, kept!])
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        '0xold:zh-HK:v': { size: SEGMENT, lastOpened: 1 },
        '0xmid:zh-HK:v': { size: SEGMENT, lastOpened: 2 },
        '0xnew:zh-HK:v': { size: SEGMENT, lastOpened: 3 },
      }))

      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 3, keepPinId: '0xnew:zh-HK:v',
      })

      expect(old.some(url => store.has(url))).toBe(false)
      expect(store.has(mid!)).toBe(true)
      expect(store.has(kept!)).toBe(true)
      expect(Object.keys(readTTSPinIndex(PREFIX)).sort()).toEqual(['0xmid:zh-HK:v', '0xnew:zh-HK:v'])
    })

    it('keeps the current download even when it alone exceeds the budget', async () => {
      const [only] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const store = installFakeCaches([only!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: 1, keepPinId: '0xa:zh-HK:v' })

      expect(store.has(only!)).toBe(true)
    })

    it('reconciles away a pin the browser purged behind our back', async () => {
      installFakeCaches([])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'gone:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 10 })

      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('leaves everything alone while under budget', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const [loose] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([pinned!, loose!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 100 })

      expect(store.size).toBe(2)
    })

    it('reports the pins still holding audio', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      installFakeCaches([pinned!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      const live = await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 100 })

      expect([...live]).toEqual(['0xa:zh-HK:v'])
    })
  })

  describe('removeTTSPins', () => {
    it('drops every segment of one download and its index entry', async () => {
      const target = buildSegmentURLs({ nftClassId: '0xA', count: 2 })
      const [other] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([...target, other!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT * 2 })

      const live = await removeTTSPins({ cacheKeyPrefix: PREFIX, pinIds: ['0xa:zh-HK:v'] })

      expect(target.some(url => store.has(url))).toBe(false)
      expect(store.has(other!)).toBe(true)
      expect(readTTSPinIndex(PREFIX)).toEqual({})
      expect([...live]).toEqual(['0xb:zh-HK:v'])
    })
  })

  it('names the cache Workbox actually writes to', () => {
    expect(TTS_AUDIO_CACHE).toBe('tts-audio')
  })
})
