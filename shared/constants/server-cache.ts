// Nitro storage mounts, declared by nuxt.config.ts. unstorage's lru-cache
// driver reads ttl from its constructor and ignores per-call options,
// so each distinct TTL needs its own mount, declared alongside its constants.
export const AIRTABLE_RECORDS_TTL_MS = 86400 * 1000 // 1 day
export const AIRTABLE_OFFSET_TTL_MS = 120 * 1000 // 2 minutes (Airtable offsets expire ~5 min)

// Search-term keys derive from per-user portrait keywords, so entry count is
// unbounded without a cap. Sized to hold every genre plus a long tail.
export const AIRTABLE_CACHE_MAX_ENTRIES = 500

// Entries hold up to 100 product rows each, so an entry cap alone leaves the
// heap unbounded on a 1 GiB instance. lru-cache derives a byte-ish size from
// the value whenever maxSize is set.
export const AIRTABLE_CACHE_MAX_SIZE_BYTES = 24 * 1024 * 1024

export const AIRTABLE_STORAGE_BASE = 'airtable'
export const AIRTABLE_OFFSET_STORAGE_BASE = 'airtable-offset'

// The sitemap keeps its own mount so its hourly TTL survives, rather than
// inheriting the day-long records TTL. Named `store-sitemap` because
// @nuxtjs/sitemap claims the bare `sitemap` mount for its own runtime cache.
export const SITEMAP_TTL_MS = 3600 * 1000
export const SITEMAP_CACHE_MAX_ENTRIES = 10
export const SITEMAP_STORAGE_BASE = 'store-sitemap'

// Spread into nitro.storage. Declared here so it is the single source the
// tests assert against: an unmounted base silently falls back to memory,
// which is the failure this whole module exists to prevent.
export const SERVER_CACHE_STORAGE = {
  [AIRTABLE_STORAGE_BASE]: {
    driver: 'lruCache',
    max: AIRTABLE_CACHE_MAX_ENTRIES,
    maxSize: AIRTABLE_CACHE_MAX_SIZE_BYTES,
    ttl: AIRTABLE_RECORDS_TTL_MS,
  },
  [AIRTABLE_OFFSET_STORAGE_BASE]: {
    driver: 'lruCache',
    max: AIRTABLE_CACHE_MAX_ENTRIES,
    ttl: AIRTABLE_OFFSET_TTL_MS,
  },
  [SITEMAP_STORAGE_BASE]: {
    driver: 'lruCache',
    max: SITEMAP_CACHE_MAX_ENTRIES,
    ttl: SITEMAP_TTL_MS,
  },
} as const
