export const READER_CACHE_KEY = 'book-file'

const READER_CACHE_KEY_SUFFIX_LIST = [
  'cfi',
  'dual-page-mode',
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
