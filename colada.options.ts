import type { PiniaColadaOptions } from '@pinia/colada'
import type { CachePersisterOptions, PersistedQueryCache, PiniaColadaStorage } from '@pinia/colada-plugin-cache-persister'
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'

import { createDebouncedStorage } from './app/utils/debounced-storage'
import { PERSISTED_QUERY_KEY_ROOTS } from './app/utils/query-key-roots'

// Bump to discard persisted caches whose shape is no longer compatible.
const PERSISTED_CACHE_VERSION = 'v2'
const PERSISTED_CACHE_PREFIX = `${PERSISTED_CACHE_VERSION}|`

// The persisted set grows with every book ever browsed (entries are
// deliberately never evicted in-session), so cap what gets written: an
// unbounded blob would eventually hit the localStorage quota — silently
// ending all persistence — and every flush stringifies the whole blob.
const MAX_PERSISTED_ENTRIES_PER_ROOT = 300

function capPersistedQueryCache(cache: PersistedQueryCache): PersistedQueryCache {
  const hashesByRoot = new Map<string, string[]>()
  for (const keyHash of Object.keys(cache)) {
    const root = String(JSON.parse(keyHash)[0])
    let hashes = hashesByRoot.get(root)
    if (!hashes) hashesByRoot.set(root, hashes = [])
    hashes.push(keyHash)
  }

  const capped: PersistedQueryCache = {}
  for (const hashes of hashesByRoot.values()) {
    if (hashes.length > MAX_PERSISTED_ENTRIES_PER_ROOT) {
      // Serialized entries carry their age (Date.now() - when) at index 2;
      // keep the most recently resolved ones.
      hashes.sort((a, b) => (cache[a]?.[2] ?? Infinity) - (cache[b]?.[2] ?? Infinity))
      hashes.length = MAX_PERSISTED_ENTRIES_PER_ROOT
    }
    for (const keyHash of hashes) {
      capped[keyHash] = cache[keyHash]
    }
  }
  return capped
}

export function createCachePersisterOptions(storage: PiniaColadaStorage): CachePersisterOptions {
  return {
    key: '3ook-query-cache',
    // The plugin serializes the whole allowlisted set before each setItem, so
    // coalescing must happen here — the debounced storage below only coalesces
    // the final string write. It stays for quota-swallowing and for flushing
    // the last produced string on pagehide/visibilitychange.
    debounce: 300,
    storage,
    filter: {
      predicate: entry => PERSISTED_QUERY_KEY_ROOTS.includes(String(entry.key[0])),
    },
    stringify: cache => PERSISTED_CACHE_PREFIX + JSON.stringify(capPersistedQueryCache(cache)),
    parse: (stored) => {
      // Throwing discards the stored cache (the plugin starts empty and the
      // next write overwrites the key with the current version).
      if (!stored.startsWith(PERSISTED_CACHE_PREFIX)) {
        throw new Error('Persisted query cache version mismatch')
      }
      return JSON.parse(stored.slice(PERSISTED_CACHE_PREFIX.length))
    },
  }
}

export default {
  plugins: import.meta.client
    ? [PiniaColadaCachePersister(createCachePersisterOptions(createDebouncedStorage(localStorage)))]
    : [],
} satisfies PiniaColadaOptions
