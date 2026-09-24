import type { RegionCode } from '~~/shared/types/user-settings'

export const MAX_BOOKSTORE_PAGE_SIZE = 100

// Built-in list types — backed by upstream `/list*`, not editor-managed CMS tags.
export const BOOKSTORE_BUILT_IN_LIST_TYPES = [
  'latest',
  'free',
  'drm-free',
  'popular',
  'bestselling',
] as const
export type BookstoreBuiltInListType = typeof BOOKSTORE_BUILT_IN_LIST_TYPES[number]

export const BOOKSTORE_DEFAULT_LIST_TYPE: BookstoreBuiltInListType = 'latest'

// Ranked upstream by lifetime reading + TTS time. Backs the library's default tab.
export const BOOKSTORE_POPULAR_LIST_TYPE: BookstoreBuiltInListType = 'popular'

// Ranked upstream by paid sales.
export const BOOKSTORE_BESTSELLING_LIST_TYPE: BookstoreBuiltInListType = 'bestselling'

// Ordered by recency upstream, except where the library asks for it ranked
// (see server/api/store/products.get.ts). Narrowed to the literal so it can type
// the upstream `filter` it is passed as.
export const BOOKSTORE_FREE_LIST_TYPE = 'free' satisfies BookstoreBuiltInListType

// Personalized feed backed by the authed /api/store/for-you endpoint. Deliberately
// not a built-in list type: /api/store/products does not serve it.
export const BOOKSTORE_FOR_YOU_LIST_TYPE = 'for-you'

export function isBookstoreBuiltInListType(value: string): value is BookstoreBuiltInListType {
  return (BOOKSTORE_BUILT_IN_LIST_TYPES as readonly string[]).includes(value)
}

export function getBookstoreScopedKey(key: string, isLibrary: boolean) {
  return isLibrary ? `library:${key}` : key
}

export function getBookEntityName(entity?: BookEntity): string {
  if (typeof entity === 'string') return entity
  return entity?.name || ''
}

// Compliance geo gate: a book tagged restrictedTerritories must not be offered in
// those regions. Checked client-side against the detected region, so the shared,
// region-less server caches stay valid.
export function getIsBookRegionRestricted(
  restrictedTerritories: string[] | undefined,
  region: RegionCode | undefined,
): boolean {
  if (!restrictedTerritories?.length || !region) return false
  // Upstream sends the territories unnormalized, so a lowercase 'hk' would open
  // the gate; region is already uppercased by parseRegionCode.
  return restrictedTerritories.some(territory => territory.toUpperCase() === region)
}

// A free edition is a listed (non-unlisted) price-0 edition. Kept in lockstep
// with ebook-cors, which independently gates free library access the same way.
export function getHasFreeEdition(prices?: BookstorePrice[]): boolean {
  return !!prices?.some(price => price.price === 0 && !price.isUnlisted)
}

// The publisher pulled the book out of the Plus library: the borrow ends there
// and then, so this outranks any subscription state. A missing listing (offline,
// not yet fetched) is not read as a removal.
export function getIsPlusReadingRemoved(info?: BookstoreInfo | null): boolean {
  return !!info && !info.isPlusReadingEnabled
}

// A Plus-reading-only book narrates only through the Plus library,
// so one taken out of the library has no TTS left at all.
export function getBookAudioAccess(info?: BookstoreInfo | null): 'none' | 'plus-reading' | 'all' {
  if (!info) return 'all'
  if (info.hideAudio) return 'none'
  if (!info.isAudioPlusReadingOnly) return 'all'
  return info.isPlusReadingEnabled ? 'plus-reading' : 'none'
}

// A Plus member may use TTS even on an owned copy opened by nft_id.
export function getIsBookAudioHiddenForRead(
  info: BookstoreInfo | null | undefined,
  { isLibraryBook, isLikerPlus }: { isLibraryBook: boolean, isLikerPlus: boolean },
): boolean {
  const access = getBookAudioAccess(info)
  if (access === 'plus-reading') return !isLibraryBook && !isLikerPlus
  return access === 'none'
}

// The For You feed falls back to the popular list below the cold-start signal
// threshold, so personalization is a property of the response, not the surface.
export function getRecommendationLLMedium(isPersonalized: boolean) {
  return isPersonalized ? 'recommendation-personalized' : 'recommendation'
}

// Also the browse grid's impression batch size, so a batch is never truncated
// by the cap it is measured against.
export const LOGGED_IMPRESSION_COUNT = 20

// The ids an impression event reports, so a later click joins back to it. One
// spelling across every surface or the join silently misses, and capped because
// a full feed of ids would otherwise ride on each event.
export function getLoggedImpressionIds(nftClassIds: Array<string | undefined>): string {
  return nftClassIds
    .map(normalizeNFTClassId)
    .filter(Boolean)
    .slice(0, LOGGED_IMPRESSION_COUNT)
    .join(',')
}
