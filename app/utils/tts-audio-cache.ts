import { TTS_AUDIO_CACHE } from '~~/shared/constants/tts-cache'
import { stripID3v2Tag } from '~~/shared/utils/id3'

/**
 * Byte budget for TTS segment audio, separate from the book files' budget so an
 * audio sweep can never evict a book or vice versa. Roughly a book's worth of
 * audio per voice, so this holds about ten downloads.
 */
export const TTS_AUDIO_CACHE_MAX_BYTES = 500 * 1024 * 1024

/**
 * Nominal segment size, matching the figure the Workbox route is sized against.
 * The sweep only ever decides whether a whole tier is over budget, so counting
 * entries beats measuring them: the streaming playback path sets no
 * content-length, and reading bodies back to size them costs a full cache read.
 */
export const TTS_SEGMENT_ESTIMATE_BYTES = 30 * 1024

// Skip a recency write if the pin was already touched within this window.
const TTS_PIN_TOUCH_INTERVAL_MS = 60 * 1000

// CacheStorage reads and deletes are one backend round trip each; a whole pin is
// ~1500 of them, so they go out in batches rather than as one unbounded fan-out
// that the service worker's playback reads would queue behind.
const CACHE_BATCH_SIZE = 32

/**
 * A download is one book in one voice: switching voice invalidates it, because
 * voice is part of every segment URL and therefore of the cache entry.
 */
/**
 * A download is one book in one voice: switching voice invalidates it, because
 * voice is part of every segment URL and therefore of the cache entry.
 */
export type TTSPinIndex = LRUCacheIndex

/**
 * Pin id derived from the segment URL's own query params rather than from the
 * client's `languageVoice`. The two disagree for custom and affiliate voices,
 * where the voice id carries no language, so the URL is the only shape both the
 * download and the sweep can agree on.
 */
export function getTTSPinIdFromURL(rawURL: string): string | undefined {
  try {
    const { searchParams } = new URL(rawURL, 'http://localhost')
    const nftClassId = searchParams.get('nft_class_id')
    const language = searchParams.get('language')
    const voiceId = searchParams.get('voice_id')
    if (!nftClassId || !language || !voiceId) return undefined
    return `${normalizeNFTClassId(nftClassId)}:${language}:${voiceId}`
  }
  catch {
    return undefined
  }
}

export function getTTSPinIndexKey(cacheKeyPrefix: string): string {
  return [cacheKeyPrefix, TTS_AUDIO_CACHE, 'pins'].join('-')
}

const ttsPinIndex = createLRUCacheIndex({
  getIndexKey: getTTSPinIndexKey,
  touchIntervalMs: TTS_PIN_TOUCH_INTERVAL_MS,
})

export function readTTSPinIndex(cacheKeyPrefix: string): TTSPinIndex {
  return ttsPinIndex.read(cacheKeyPrefix)
}

/** Record a completed download. Returns the updated index for the sweep. */
export function recordTTSPin({
  cacheKeyPrefix,
  pinId,
  size,
}: {
  cacheKeyPrefix: string
  pinId: string
  size: number
}): TTSPinIndex {
  return ttsPinIndex.record({ cacheKeyPrefix, key: pinId, size })
}

/** Bump recency so an actively replayed download is not evicted as stale. */
export function touchTTSPin({ cacheKeyPrefix, pinId }: { cacheKeyPrefix: string, pinId: string }) {
  // No upsert, unlike the book index: membership here means "downloaded", so
  // creating an entry would promote disposable lookahead into a protected pin.
  ttsPinIndex.touch({ cacheKeyPrefix, key: pinId })
}

/**
 * Downloads currently writing segments. Module scope, not composable state:
 * each useOfflineTTS() call owns its own refs, so a sweep started from one
 * instance would otherwise treat another's in-flight download as loose
 * lookahead and delete it — and the download would then record bytes for
 * segments that no longer exist, permanently overstating the pin.
 */
const inFlightPinIds = new Set<string>()

/** Protect a pin for the duration of a download. Returns the release callback. */
export function markTTSPinInFlight(pinId: string): () => void {
  inFlightPinIds.add(pinId)
  return () => inFlightPinIds.delete(pinId)
}

export function getIsTTSPinInFlight(pinId: string): boolean {
  return inFlightPinIds.has(pinId)
}

/** Every cache entry grouped by the pin it belongs to, read from the live cache. */
async function groupEntriesByPin(cache: Cache): Promise<Map<string, Request[]>> {
  const grouped = new Map<string, Request[]>()
  for (const request of await cache.keys()) {
    const pinId = getTTSPinIdFromURL(request.url) ?? ''
    const list = grouped.get(pinId) ?? []
    list.push(request)
    grouped.set(pinId, list)
  }
  return grouped
}

/** Pins with audio actually present, so a badge never promises an evicted download. */
export async function getLiveTTSPinIds(): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches) return new Set()
  try {
    const cache = await window.caches.open(TTS_AUDIO_CACHE)
    const live = new Set((await groupEntriesByPin(cache)).keys())
    live.delete('')
    return live
  }
  catch (error) {
    console.error(error)
    return new Set()
  }
}

async function deleteEntries(cache: Cache, requests: Request[]) {
  for (let index = 0; index < requests.length; index += CACHE_BATCH_SIZE) {
    const batch = requests.slice(index, index + CACHE_BATCH_SIZE)
    await Promise.all(batch.map(request => cache.delete(request)))
  }
}

/**
 * Drop every cached segment of one download, e.g. on a voice switch or a
 * returned borrow. Returns the surviving live pins for the caller's badge.
 */
export async function removeTTSPins({
  cacheKeyPrefix,
  pinIds,
}: {
  cacheKeyPrefix: string
  pinIds: string[]
}): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches || !pinIds.length) return new Set()
  try {
    const cache = await window.caches.open(TTS_AUDIO_CACHE)
    const grouped = await groupEntriesByPin(cache)
    for (const pinId of pinIds) {
      await deleteEntries(cache, grouped.get(pinId) ?? [])
      grouped.delete(pinId)
    }
    ttsPinIndex.remove({ cacheKeyPrefix, keys: pinIds })
    const live = new Set(grouped.keys())
    live.delete('')
    return live
  }
  catch (error) {
    console.error(error)
    return new Set()
  }
}

/**
 * The key Workbox stored a segment under: its `cacheKeyWillBeUsed` strips
 * `blocking`, which the native shell sets on every request, so matching the
 * request URL as-issued would miss every entry inside the app. Deliberately not
 * shared with that handler, which generateSW serialises via toString() — an
 * imported binding is out of scope there, and so is `window`.
 */
export function getTTSCacheKeyURL(rawURL: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const url = new URL(rawURL, origin)
  url.searchParams.delete('blocking')
  return url.href
}

/**
 * Which of the given segment URLs are already stored, returned as the caller's
 * own URLs so it never has to normalize twice. One `keys()` walk rather than a
 * match per URL: a book runs to ~1200 segments and this wants membership, not
 * bodies.
 */
export async function getCachedTTSSegmentURLs(rawURLs: string[]): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches || !rawURLs.length) return new Set()
  try {
    const cache = await window.caches.open(TTS_AUDIO_CACHE)
    const stored = new Set((await cache.keys()).map(request => request.url))
    return new Set(rawURLs.filter(rawURL => stored.has(getTTSCacheKeyURL(rawURL))))
  }
  catch (error) {
    console.error(error)
    return new Set()
  }
}

/**
 * Cached MP3 frames for the given segment URLs, in the order asked for, with
 * each segment's own ID3 tag removed. Read by URL rather than by walking the
 * cache, whose keys are text-hashed and carry no playback order. A miss comes
 * back as undefined: a partial download is still worth exporting.
 */
export async function readTTSSegmentAudio(rawURLs: string[]): Promise<(Uint8Array | undefined)[]> {
  if (typeof window === 'undefined' || !window.caches) return rawURLs.map(() => undefined)
  try {
    const cache = await window.caches.open(TTS_AUDIO_CACHE)
    const frames: (Uint8Array | undefined)[] = []
    // Concurrent within a batch: every frame is retained either way, so
    // serialising saves no memory and only costs the user a spinner.
    for (let index = 0; index < rawURLs.length; index += CACHE_BATCH_SIZE) {
      const batch = rawURLs.slice(index, index + CACHE_BATCH_SIZE)
      frames.push(...await Promise.all(batch.map(async (rawURL) => {
        // ignoreVary mirrors the route that wrote these: edge copies minted
        // before that deploy carry `vary: Range` and would never match.
        const response = await cache.match(getTTSCacheKeyURL(rawURL), { ignoreVary: true })
        return response ? stripID3v2Tag(new Uint8Array(await response.arrayBuffer())) : undefined
      })))
    }
    return frames
  }
  catch (error) {
    console.error(error)
    return rawURLs.map(() => undefined)
  }
}

/**
 * Drop every voice's audio for one book, e.g. when a borrow is returned. Covers
 * the playback lookahead as well as downloads: both are local bytes that would
 * otherwise outlive the access that produced them.
 */
export async function removeTTSPinsForBook({
  cacheKeyPrefix,
  nftClassId,
}: {
  cacheKeyPrefix: string
  nftClassId: string
}): Promise<Set<string>> {
  const prefix = `${normalizeNFTClassId(nftClassId)}:`
  const livePinIds = await getLiveTTSPinIds()
  const pinIds = [...new Set([...livePinIds, ...Object.keys(readTTSPinIndex(cacheKeyPrefix))])]
    .filter(pinId => pinId.startsWith(prefix))
  return removeTTSPins({ cacheKeyPrefix, pinIds })
}

/**
 * Keep the TTS audio cache under budget. Unpinned entries are the player's own
 * lookahead — written by the service worker, so the app has no recency for them
 * and simply drops them all first; they refill on the next listen. Only then are
 * whole downloads evicted, least-recently-opened first, never `keepPinId`.
 *
 * Safe to call fire-and-forget; failures are swallowed.
 */
export async function pruneTTSAudioCache({
  cacheKeyPrefix,
  keepPinId,
  maxBytes = TTS_AUDIO_CACHE_MAX_BYTES,
  index: providedIndex,
}: {
  cacheKeyPrefix: string
  keepPinId?: string
  maxBytes?: number
  index?: TTSPinIndex
}): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches) return new Set()
  try {
    const cache = await window.caches.open(TTS_AUDIO_CACHE)
    const grouped = await groupEntriesByPin(cache)
    const stored = providedIndex ?? readTTSPinIndex(cacheKeyPrefix)

    // Reconcile: a pin whose entries are gone (a browser-level quota purge)
    // must leave the index, or the sweep budgets against bytes that don't exist.
    const index: TTSPinIndex = {}
    const dropped = new Set<string>()
    for (const [pinId, entry] of Object.entries(stored)) {
      if (grouped.has(pinId)) index[pinId] = entry
      else dropped.add(pinId)
    }

    // A download's recorded size covers only what it fetched; ordinary listening
    // adds more segments under the same pin. Count what is actually there, so
    // those bytes are neither invisible to the budget nor undeletable.
    const getGroupBytes = (pinId: string) =>
      (grouped.get(pinId)?.length ?? 0) * TTS_SEGMENT_ESTIMATE_BYTES
    let total = Object.entries(index)
      .reduce((sum, [pinId, entry]) => sum + Math.max(entry.size, getGroupBytes(pinId)), 0)

    // A download in flight has entries but registers only on completion, so it
    // is protected alongside keepPinId. Its bytes still count against the budget
    // — they are on disk — they are just never the ones freed.
    const protectedPinIds = new Set(inFlightPinIds)
    if (keepPinId) protectedPinIds.add(keepPinId)
    for (const pinId of protectedPinIds) {
      if (!index[pinId]) total += getGroupBytes(pinId)
    }

    const unpinned = [...grouped.entries()]
      .filter(([pinId]) => !protectedPinIds.has(pinId) && (!pinId || !index[pinId]))
      .flatMap(([, requests]) => requests)
    if (unpinned.length) {
      const unpinnedBytes = unpinned.length * TTS_SEGMENT_ESTIMATE_BYTES
      total += unpinnedBytes
      if (total > maxBytes) {
        await deleteEntries(cache, unpinned)
        total -= unpinnedBytes
      }
    }

    const evicted = new Set<string>()
    if (total > maxBytes) {
      const evictable = Object.entries(index)
        .filter(([pinId]) => !protectedPinIds.has(pinId))
        .sort((a, b) => a[1].lastOpened - b[1].lastOpened)
      for (const [pinId, entry] of evictable) {
        if (total <= maxBytes) break
        // Size the group before dropping it from `grouped`, or getGroupBytes
        // reads zero and the total under-subtracts, evicting more than needed.
        const freed = Math.max(entry.size, getGroupBytes(pinId))
        await deleteEntries(cache, grouped.get(pinId) ?? [])
        grouped.delete(pinId)
        evicted.add(pinId)
        total -= freed
      }
    }

    ttsPinIndex.remove({ cacheKeyPrefix, keys: [...dropped, ...evicted] })
    const live = new Set(grouped.keys())
    live.delete('')
    return live
  }
  catch (error) {
    console.error(error)
    return new Set()
  }
}
