export const MAX_BOOKSTORE_PAGE_SIZE = 100

// Built-in list types — backed by upstream `/list*`, not editor-managed CMS tags.
export const BOOKSTORE_BUILT_IN_LIST_TYPES = ['latest', 'free', 'drm-free', 'popular'] as const
export type BookstoreBuiltInListType = typeof BOOKSTORE_BUILT_IN_LIST_TYPES[number]

export const BOOKSTORE_DEFAULT_LIST_TYPE: BookstoreBuiltInListType = 'latest'

// Ranked upstream by lifetime reading + TTS time. Backs the library's default tab.
export const BOOKSTORE_POPULAR_LIST_TYPE: BookstoreBuiltInListType = 'popular'

export function isBookstoreBuiltInListType(value: string): value is BookstoreBuiltInListType {
  return (BOOKSTORE_BUILT_IN_LIST_TYPES as readonly string[]).includes(value)
}

export function getBookstoreScopedKey(key: string, isLibrary: boolean) {
  return isLibrary ? `library:${key}` : key
}

// A free edition is a listed (non-unlisted) price-0 edition. Kept in lockstep
// with ebook-cors, which independently gates free library access the same way.
export function getHasFreeEdition(prices?: BookstorePrice[]): boolean {
  return !!prices?.some(price => price.price === 0 && !price.isUnlisted)
}
