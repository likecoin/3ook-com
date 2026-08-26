import { TTS_SERVER_SOURCE, TTS_SERVER_TIMING_METRIC } from '~~/shared/utils/tts-server-timing'
import { getTTSCacheKeyURL } from '~/utils/tts-audio-url'

export type TTSCacheStatus = 'hit' | 'miss' | 'warm_hit' | 'unknown'

// Where the audio bytes came from, in ascending cost order:
// browser_cache (free) < cdn_or_storage (cheap) < generated (Minimax, $$$).
// "cdn_or_storage" collapses the Cloudflare edge and Cloud Storage layers:
// both serve a previously-stored file with Server-Timing desc="store", and a
// media-element load cannot read cf-cache-status to tell them apart.
// "native" is reported by the WebView shell, whose audio pipeline is opaque.
// "service_worker" is a segment the prefetch runway drained into the Workbox
// cache: local bytes, but a worker-served reply carries no usable timing.
export type TTSAudioSource = 'browser_cache' | 'cdn_or_storage' | 'generated' | 'native' | 'service_worker' | 'unknown'

const TTS_URL_PATTERN = /\/api\/reader\/tts(?:\?|$)/
// Prefetch warms carry blocking=1 and are never played back, so tracking them
// would spend half the window below on entries nothing ever looks up.
const TTS_BLOCKING_URL_PATTERN = /[?&]blocking=1(?:&|$)/
const MAX_TRACKED_URLS = 200
// Kept far below the TTS route's own `maxEntries` in nuxt.config: a key only
// tells the truth while Workbox still holds the entry, so the registry must be
// the first of the two to forget a segment.
const MAX_WARMED_KEYS = 200

const latestByURL = new Map<string, PerformanceResourceTiming>()
let observer: PerformanceObserver | null = null

// Both stores below are insertion-ordered, so the oldest key is the first one.
function evictOldest(store: { size: number, keys: () => IterableIterator<string>, delete: (key: string) => unknown }, max: number) {
  if (store.size <= max) return
  const oldest = store.keys().next().value
  if (oldest) store.delete(oldest)
}

// Cache keys the warm runway has confirmed stored, so playback can tell a
// worker-served segment from one that simply reported no timing.
const warmedCacheKeys = new Set<string>()

export function markTTSSegmentWarmed(rawURL: string) {
  const key = getTTSCacheKeyURL(rawURL)
  // delete+add so a re-warm refreshes its insertion order (LRU eviction)
  warmedCacheKeys.delete(key)
  warmedCacheKeys.add(key)
  evictOldest(warmedCacheKeys, MAX_WARMED_KEYS)
}

export function clearTTSWarmedSegments() {
  warmedCacheKeys.clear()
}

function isTTSSegmentWarmed(rawURL: string): boolean {
  return !!rawURL && warmedCacheKeys.has(getTTSCacheKeyURL(rawURL))
}

function ensureObserver() {
  if (observer || typeof PerformanceObserver === 'undefined') return
  if (!PerformanceObserver.supportedEntryTypes?.includes('resource')) return
  const nextObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!TTS_URL_PATTERN.test(entry.name)) continue
      if (TTS_BLOCKING_URL_PATTERN.test(entry.name)) continue
      // delete+set so repeat URLs refresh their insertion order (LRU eviction)
      latestByURL.delete(entry.name)
      latestByURL.set(entry.name, entry as PerformanceResourceTiming)
      evictOldest(latestByURL, MAX_TRACKED_URLS)
    }
  })
  try {
    nextObserver.observe({ type: 'resource', buffered: true })
    observer = nextObserver
  }
  catch {
    // Environment accepts PerformanceObserver but not this entry type / buffered
  }
}

function getTTSResourceEntry(audioURL: string): PerformanceResourceTiming | undefined {
  if (!audioURL || typeof PerformanceObserver === 'undefined') return undefined
  ensureObserver()
  // Buffered observer entries flush asynchronously, so on the first call
  // fall back to a synchronous query against the browser's resource buffer.
  return latestByURL.get(audioURL)
    ?? (performance.getEntriesByName(audioURL, 'resource').at(-1) as PerformanceResourceTiming | undefined)
}

export function classifyTTSCacheStatus(audioURL: string): TTSCacheStatus {
  const entry = getTTSResourceEntry(audioURL)
  // decodedBodySize === 0 means no Timing-Allow-Origin, or a service worker reply.
  if (!entry || entry.decodedBodySize === 0) {
    return isTTSSegmentWarmed(audioURL) ? 'warm_hit' : 'unknown'
  }
  return entry.transferSize === 0 ? 'hit' : 'miss'
}

// Sizes the "expensive Minimax generation" slice of tts_segment_loaded.
// transferSize === 0 wins first: a browser-cache replay has no fresh response
// (and no Server-Timing), so it must be classified before reading the header.
// Otherwise the origin's per-request Server-Timing desc decides: "gen" means a
// Minimax call happened, "store" means a stored file (Cloud Storage, or a
// Cloudflare edge HIT replaying the stored header) — see TTSAudioSource.
export function classifyTTSAudioSource(audioURL: string): TTSAudioSource {
  const entry = getTTSResourceEntry(audioURL)
  if (!entry || entry.decodedBodySize === 0) {
    return isTTSSegmentWarmed(audioURL) ? 'service_worker' : 'unknown'
  }
  if (entry.transferSize === 0) return 'browser_cache'
  const desc = entry.serverTiming?.find(metric => metric.name === TTS_SERVER_TIMING_METRIC)?.description
  if (desc === TTS_SERVER_SOURCE.GENERATED) return 'generated'
  if (desc === TTS_SERVER_SOURCE.STORED) return 'cdn_or_storage'
  return 'unknown'
}
