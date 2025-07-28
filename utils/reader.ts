export const READER_CACHE_KEY = 'book-file'

const READER_CACHE_KEY_SUFFIX_LIST = [
  'cfi',
  'dual-page-mode',
  'locations',
  'right-to-left',
  'scale',
  'tts-index',
] as const

export type ReaderCacheKeySuffix = (typeof READER_CACHE_KEY_SUFFIX_LIST)[number]

export function getReaderCacheKeySuffixes() {
  return READER_CACHE_KEY_SUFFIX_LIST
}

export function getReaderCacheKeyWithSuffix(key: string, suffix: ReaderCacheKeySuffix) {
  return `${key}-${suffix}`
}
