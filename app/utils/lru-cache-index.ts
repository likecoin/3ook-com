export interface LRUCacheIndexEntry {
  size: number
  lastOpened: number
}

export type LRUCacheIndex = Record<string, LRUCacheIndexEntry>

/**
 * A localStorage sidecar recording size and recency per cache entry, so an LRU
 * sweep never has to read or re-parse the cached bodies — CacheStorage entries
 * carry no timestamp of their own.
 *
 * Shared by the book-file caches and the TTS audio cache: separate indexes
 * under separate budgets, but identical bookkeeping.
 */
export function createLRUCacheIndex({
  getIndexKey,
  touchIntervalMs,
  shouldCreateMissingOnTouch = false,
}: {
  getIndexKey: (cacheKeyPrefix: string) => string
  touchIntervalMs: number
  /**
   * Upsert a zero-size entry when a touched key is absent, for an index whose
   * membership merely tracks what is cached. Left off where membership means
   * "deliberately kept", so a touch can never promote a disposable entry into
   * a protected one.
   */
  shouldCreateMissingOnTouch?: boolean
}) {
  function read(cacheKeyPrefix: string): LRUCacheIndex {
    if (typeof window === 'undefined' || !window.localStorage) return {}
    try {
      const raw = window.localStorage.getItem(getIndexKey(cacheKeyPrefix))
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      // Coerce each entry — one NaN size would make the sweep's total NaN and
      // silently disable the eviction this index exists to support.
      const sanitized: LRUCacheIndex = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue
        const size = Number((value as { size?: unknown }).size)
        const lastOpened = Number((value as { lastOpened?: unknown }).lastOpened)
        if (!Number.isFinite(size) || !Number.isFinite(lastOpened)) continue
        sanitized[key] = { size, lastOpened }
      }
      return sanitized
    }
    catch {
      return {}
    }
  }

  function write(cacheKeyPrefix: string, index: LRUCacheIndex) {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      window.localStorage.setItem(getIndexKey(cacheKeyPrefix), JSON.stringify(index))
    }
    catch (error) {
      console.error(error)
    }
  }

  /**
   * Record a freshly cached entry. Returns the updated index so a sweep that
   * follows needs no second localStorage read.
   */
  function record({ cacheKeyPrefix, key, size }: {
    cacheKeyPrefix: string
    key: string
    size: number
  }): LRUCacheIndex {
    const index = read(cacheKeyPrefix)
    index[key] = { size, lastOpened: Date.now() }
    write(cacheKeyPrefix, index)
    return index
  }

  /** Bump recency so an actively reused entry is not evicted as stale. */
  function touch({ cacheKeyPrefix, key }: { cacheKeyPrefix: string, key: string }) {
    const index = read(cacheKeyPrefix)
    const entry = index[key]
    if (!entry && !shouldCreateMissingOnTouch) return
    const now = Date.now()
    if (entry && now - entry.lastOpened < touchIntervalMs) return
    index[key] = { size: entry?.size ?? 0, lastOpened: now }
    write(cacheKeyPrefix, index)
  }

  /**
   * Drop entries for caches deleted outside the sweep. Re-reads first, so an
   * entry recorded during the caller's awaits is not clobbered by a stale
   * snapshot.
   */
  function remove({ cacheKeyPrefix, keys }: {
    cacheKeyPrefix: string
    keys: Iterable<string>
  }) {
    const removed = new Set(keys)
    if (!removed.size) return
    const index = read(cacheKeyPrefix)
    if (!Object.keys(index).some(key => removed.has(key))) return
    write(
      cacheKeyPrefix,
      Object.fromEntries(Object.entries(index).filter(([key]) => !removed.has(key))),
    )
  }

  return { read, write, record, touch, remove }
}
