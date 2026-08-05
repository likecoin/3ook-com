export const READER_CACHE_KEY = 'book-file'

const READER_CACHE_KEY_SUFFIX_LIST = [
  'cfi',
  'dual-page-mode',
  'font-size',
  'line-height',
  'locations',
  'right-to-left',
  'scale',
  'tts-index',
  'progress',
  'last-opened',
] as const

export type ReaderCacheKeySuffix = (typeof READER_CACHE_KEY_SUFFIX_LIST)[number]

export function getReaderCacheKeySuffixes() {
  return READER_CACHE_KEY_SUFFIX_LIST
}

export function getReaderCacheKeyWithSuffix(key: string, suffix: ReaderCacheKeySuffix) {
  return `${key}-${suffix}`
}

/**
 * Prefix shared by every cached variant of one book — a book has one cache per
 * file index x custom-message flag — so callers can sweep them all at once.
 * Omit nftClassId for the prefix covering every book file in the app.
 */
export function getBookFileCacheKeyPrefix({
  cacheKeyPrefix,
  nftClassId,
  isUploadedBook = false,
}: {
  cacheKeyPrefix: string
  nftClassId?: string
  isUploadedBook?: boolean
}): string {
  const segments = [cacheKeyPrefix, READER_CACHE_KEY]
  if (isUploadedBook) segments.push('upload')
  if (nftClassId) segments.push(isUploadedBook ? nftClassId : nftClassId.toLowerCase())
  return segments.join('-')
}

/**
 * Cache name of a single book file variant. Lives here, not in use-reader, so
 * the shelf can predict the exact name the reader will look up without opening
 * the book — the two drifting apart would silently break the offline badge.
 */
export function getBookFileCacheKey({
  cacheKeyPrefix,
  nftClassId,
  nftId,
  fileIndex = '0',
  isCustomMessageEnabled = false,
  isUploadedBook = false,
  isPreview = false,
}: {
  cacheKeyPrefix: string
  nftClassId: string
  nftId?: string
  fileIndex?: string | number
  isCustomMessageEnabled?: boolean
  isUploadedBook?: boolean
  isPreview?: boolean
}): string {
  const prefix = getBookFileCacheKeyPrefix({ cacheKeyPrefix, nftClassId, isUploadedBook })
  // An upload has a single file, so the prefix is already the whole name.
  if (isUploadedBook) return prefix
  return [
    prefix,
    nftId,
    fileIndex,
    isCustomMessageEnabled ? '1' : '0',
    // Explicit marker: a Plus borrow also carries no nftId, so without it
    // the truncated preview and the full borrowed file would share a cache.
    isPreview ? 'preview' : undefined,
  ].filter(value => value !== undefined).join('-')
}

/**
 * Which copy of a book file is stored offline, or undefined when none is. The
 * reader caches under whichever nft_id it opened with, so the hit may not be
 * nftIds[0]. Empty nftIds means a borrow, which caches under no nft_id at all.
 */
export function findOfflineBookCopy({
  offlineCacheKeys,
  cacheKeyPrefix,
  nftClassId,
  nftIds,
  fileIndex,
  isCustomMessageEnabled,
}: {
  offlineCacheKeys: Set<string>
  cacheKeyPrefix: string
  nftClassId: string
  nftIds?: string[]
  fileIndex?: string | number
  isCustomMessageEnabled?: boolean
}): { nftId?: string } | undefined {
  const candidates: Array<string | undefined> = nftIds?.length ? nftIds : [undefined]
  // findIndex and a wrapped result, since a borrow's hit is itself undefined.
  const index = candidates.findIndex(candidate => offlineCacheKeys.has(getBookFileCacheKey({
    cacheKeyPrefix,
    nftClassId,
    nftId: candidate,
    fileIndex,
    isCustomMessageEnabled,
  })))
  return index === -1 ? undefined : { nftId: candidates[index] }
}

/**
 * Whether a cache name belongs to the given book. The `-` boundary matters:
 * a bare startsWith would also match a different book whose id extends this
 * one's, and uploaded-book ids are not fixed-length.
 */
export function isBookFileCacheKeyOfPrefix(cacheKey: string, prefix: string): boolean {
  return cacheKey === prefix || cacheKey.startsWith(`${prefix}-`)
}

/**
 * Total byte budget for cached EPUB/PDF book files. The Cache API has no
 * built-in quota eviction, so we run an LRU sweep to stay under this limit.
 * 500 MB holds dozens of books while staying within typical browser/WebView
 * storage quotas.
 */
export const BOOK_FILE_CACHE_MAX_BYTES = 500 * 1024 * 1024

// Skip a recency write if the entry was already touched within this window —
// re-reads during a session would otherwise rewrite the index repeatedly.
const BOOK_FILE_CACHE_TOUCH_INTERVAL_MS = 60 * 1000

type BookFileCacheIndex = Record<string, { size: number, lastOpened: number }>

/**
 * Recency lives in this localStorage sidecar, not in the Cache entry (which
 * has no timestamp), so the LRU sweep never has to read or re-parse blobs.
 */
export function getBookFileCacheIndexKey(cacheKeyPrefix: string): string {
  return [cacheKeyPrefix, READER_CACHE_KEY, 'cache-index'].join('-')
}

function readBookFileCacheIndex(cacheKeyPrefix: string): BookFileCacheIndex {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(getBookFileCacheIndexKey(cacheKeyPrefix))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // Coerce each entry — a single NaN size would make the eviction total NaN
    // and silently disable the LRU sweep that this index exists to support.
    const sanitized: BookFileCacheIndex = {}
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

function writeBookFileCacheIndex(cacheKeyPrefix: string, index: BookFileCacheIndex) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(getBookFileCacheIndexKey(cacheKeyPrefix), JSON.stringify(index))
  }
  catch (error) {
    console.error(error)
  }
}

/**
 * Record a freshly cached book file. Returns the updated index so the caller
 * can hand it to pruneBookFileCaches without a second localStorage read.
 */
export function recordBookFileCacheEntry({
  cacheKeyPrefix,
  cacheKey,
  size,
}: {
  cacheKeyPrefix: string
  cacheKey: string
  size: number
}): BookFileCacheIndex {
  const index = readBookFileCacheIndex(cacheKeyPrefix)
  index[cacheKey] = { size, lastOpened: Date.now() }
  writeBookFileCacheIndex(cacheKeyPrefix, index)
  return index
}

/**
 * Bump recency for a cache hit (no cache.put runs) so an actively re-read
 * book is not evicted as "old". Upserts a zero-size entry if metadata was
 * lost, mirroring pruneBookFileCaches' reconcile.
 */
export function touchBookFileCacheEntry({
  cacheKeyPrefix,
  cacheKey,
}: {
  cacheKeyPrefix: string
  cacheKey: string
}) {
  const index = readBookFileCacheIndex(cacheKeyPrefix)
  const entry = index[cacheKey]
  const now = Date.now()
  if (entry && now - entry.lastOpened < BOOK_FILE_CACHE_TOUCH_INTERVAL_MS) return
  index[cacheKey] = { size: entry?.size ?? 0, lastOpened: now }
  writeBookFileCacheIndex(cacheKeyPrefix, index)
}

/**
 * Drop index entries for caches that were deleted outside the LRU sweep (a
 * returned borrow, a deleted upload). Without this the entries linger and
 * inflate the total the sweep budgets against until it next reconciles.
 */
export function removeBookFileCacheEntries({
  cacheKeyPrefix,
  cacheKeys,
}: {
  cacheKeyPrefix: string
  cacheKeys: string[]
}) {
  if (!cacheKeys.length) return
  const index = readBookFileCacheIndex(cacheKeyPrefix)
  const removed = new Set(cacheKeys.filter(cacheKey => cacheKey in index))
  if (!removed.size) return
  writeBookFileCacheIndex(
    cacheKeyPrefix,
    Object.fromEntries(Object.entries(index).filter(([name]) => !removed.has(name))),
  )
}

/**
 * LRU sweep over cached book files. Reconciles the index with the real
 * CacheStorage, then — if the total exceeds BOOK_FILE_CACHE_MAX_BYTES —
 * deletes the least-recently-opened book caches until back under budget.
 * The currently-open book (keepCacheKey) is never evicted. Safe to call
 * fire-and-forget; failures are swallowed.
 */
export async function pruneBookFileCaches({
  cacheKeyPrefix,
  keepCacheKey,
  maxBytes = BOOK_FILE_CACHE_MAX_BYTES,
  index: providedIndex,
}: {
  cacheKeyPrefix: string
  keepCacheKey?: string
  maxBytes?: number
  index?: BookFileCacheIndex
}) {
  if (typeof window === 'undefined' || !window.caches) return
  try {
    const bookCachePrefix = getBookFileCacheKeyPrefix({ cacheKeyPrefix })
    const liveNames = new Set(
      (await window.caches.keys()).filter(name => isBookFileCacheKeyOfPrefix(name, bookCachePrefix)),
    )

    const stored = providedIndex ?? readBookFileCacheIndex(cacheKeyPrefix)

    // Keep only entries whose cache still exists; synthesize entries for
    // caches with lost metadata as just-opened so a valid book is never
    // evicted on a guess (the next fresh download records its real size).
    let didChange = false
    const index: BookFileCacheIndex = {}
    for (const name of liveNames) {
      const entry = stored[name]
      if (entry) index[name] = entry
      else {
        index[name] = { size: 0, lastOpened: Date.now() }
        didChange = true
      }
    }
    if (!didChange) {
      didChange = Object.keys(stored).some(name => !liveNames.has(name))
    }

    let total = Object.values(index).reduce((sum, entry) => sum + entry.size, 0)
    const evicted = new Set<string>()
    if (total > maxBytes) {
      const evictable = Object.entries(index)
        .filter(([name]) => name !== keepCacheKey)
        .sort((a, b) => a[1].lastOpened - b[1].lastOpened)

      for (const [name, entry] of evictable) {
        if (total <= maxBytes) break
        await window.caches.delete(name)
        evicted.add(name)
        total -= entry.size
      }
    }

    if (!didChange && evicted.size === 0) return

    const next = evicted.size
      ? Object.fromEntries(Object.entries(index).filter(([name]) => !evicted.has(name)))
      : index
    writeBookFileCacheIndex(cacheKeyPrefix, next)
  }
  catch (error) {
    console.error(error)
  }
}

/**
 * Get localStorage key prefix for book progress/config (per NFT class, not per NFT ID)
 * Progress is tracked at the book level, not individual NFT level
 */
export function getBookProgressKeyPrefix({
  nftClassId,
  cacheKeyPrefix,
}: {
  nftClassId: string
  cacheKeyPrefix: string
}): string {
  const normalizedNftClassId = nftClassId.toLowerCase()
  return [
    cacheKeyPrefix,
    READER_CACHE_KEY,
    normalizedNftClassId,
  ].join('-')
}

/**
 * Get book progress data from localStorage
 * Progress is tracked per NFT class, not per NFT ID or custom message settings
 * @returns Object containing lastOpenedTime and progress (0-1 range)
 */
export function getBookProgressData({
  nftClassId,
  cacheKeyPrefix,
}: {
  nftClassId: string
  cacheKeyPrefix: string
}): { lastOpenedTime: number, progress: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { lastOpenedTime: 0, progress: 0 }
  }

  const progressKeyPrefix = getBookProgressKeyPrefix({ nftClassId, cacheKeyPrefix })

  const lastOpenedKey = getReaderCacheKeyWithSuffix(progressKeyPrefix, 'last-opened')
  const progressKey = getReaderCacheKeyWithSuffix(progressKeyPrefix, 'progress')

  const lastOpenedTimeStr = window.localStorage.getItem(lastOpenedKey)
  const progressStr = window.localStorage.getItem(progressKey)

  return {
    lastOpenedTime: lastOpenedTimeStr ? Number(lastOpenedTimeStr) || 0 : 0,
    progress: progressStr ? Number(progressStr) || 0 : 0,
  }
}

// Minimum char count before the garbled-text heuristic will commit to a
// verdict — short runs (page numbers, captions) are too noisy to score.
const GARBLED_PDF_TEXT_MIN_LENGTH = 50

// Symbol density above which a page is treated as unreadable glyph-ID output.
// French/Spanish with «» and accents stays comfortably under ~10%; garbled
// glyph dumps from missing-ToUnicode fonts run 25–50%+.
const GARBLED_PDF_TEXT_SYMBOL_RATIO = 0.15

// Share of garbled pages above which the whole PDF is refused for TTS. A
// single garbled cover or colophon shouldn't disable TTS, but once a third
// of pages would speak nonsense the experience is broken.
export const PDF_UNREADABLE_PAGE_RATIO = 0.3

/**
 * Detect PDF text that came out of a font with no `/ToUnicode` CMap, where
 * pdf.js exposes raw glyph IDs reinterpreted as characters. These land
 * predictably in the Latin-1 punctuation/symbol block (¬ ¯ ¶ « ¼ ½ …),
 * standalone modifier letters, and PUA — ranges that real prose barely
 * touches. Returns false for short strings to avoid false positives on
 * page numbers and short captions.
 */
export function isLikelyGarbledPDFText(text: string): boolean {
  let symbols = 0
  let total = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp <= 0x20) continue
    total++
    if (
      (cp >= 0x00A1 && cp <= 0x00BF)
      || cp === 0x00D7 || cp === 0x00F7
      || (cp >= 0x02B0 && cp <= 0x02FF)
      || (cp >= 0xE000 && cp <= 0xF8FF)
    ) symbols++
  }
  if (total < GARBLED_PDF_TEXT_MIN_LENGTH) return false
  return symbols / total > GARBLED_PDF_TEXT_SYMBOL_RATIO
}

/**
 * Final verdict over a PDF's per-page garbled counts. Pass the actual
 * running totals after a full pass to decide whether to refuse TTS, or
 * pass `pagesWithText: totalPagesInDocument` mid-iteration to test
 * whether the verdict is already locked (best-case-remaining: every
 * remaining page is clean prose).
 */
export function isPDFCorpusUnreadable({
  pagesWithText,
  garbledPages,
}: {
  pagesWithText: number
  garbledPages: number
}): boolean {
  return pagesWithText > 0 && garbledPages / pagesWithText > PDF_UNREADABLE_PAGE_RATIO
}
