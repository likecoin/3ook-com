import { TTS_SERVER_SOURCE, TTS_SERVER_TIMING_METRIC } from '~~/shared/utils/tts-server-timing'

export type TTSCacheStatus = 'hit' | 'miss' | 'unknown'

// Where the audio bytes came from, in ascending cost order:
// browser_cache (free) < cdn_or_storage (cheap) < generated (Minimax, $$$).
// "cdn_or_storage" collapses the Cloudflare edge and Cloud Storage layers:
// both serve a previously-stored file with Server-Timing desc="store", and a
// media-element load cannot read cf-cache-status to tell them apart.
// "native" is reported by the WebView shell, whose audio pipeline is opaque.
export type TTSAudioSource = 'browser_cache' | 'cdn_or_storage' | 'generated' | 'native' | 'unknown'

const TTS_URL_PATTERN = /\/api\/reader\/tts(?:\?|$)/
const MAX_TRACKED_URLS = 200

const latestByURL = new Map<string, PerformanceResourceTiming>()
let observer: PerformanceObserver | null = null

function ensureObserver() {
  if (observer || typeof PerformanceObserver === 'undefined') return
  if (!PerformanceObserver.supportedEntryTypes?.includes('resource')) return
  const nextObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!TTS_URL_PATTERN.test(entry.name)) continue
      // delete+set so repeat URLs refresh their insertion order (LRU eviction)
      latestByURL.delete(entry.name)
      latestByURL.set(entry.name, entry as PerformanceResourceTiming)
      if (latestByURL.size > MAX_TRACKED_URLS) {
        const oldest = latestByURL.keys().next().value
        if (oldest) latestByURL.delete(oldest)
      }
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
  // decodedBodySize === 0 means cross-origin without Timing-Allow-Origin
  if (!entry || entry.decodedBodySize === 0) return 'unknown'
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
  if (!entry || entry.decodedBodySize === 0) return 'unknown'
  if (entry.transferSize === 0) return 'browser_cache'
  const desc = entry.serverTiming?.find(metric => metric.name === TTS_SERVER_TIMING_METRIC)?.description
  if (desc === TTS_SERVER_SOURCE.GENERATED) return 'generated'
  if (desc === TTS_SERVER_SOURCE.STORED) return 'cdn_or_storage'
  return 'unknown'
}
