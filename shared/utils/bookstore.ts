export const MAX_BOOKSTORE_PAGE_SIZE = 100

// Built-in list types — backed by upstream `/list*`, not editor-managed CMS tags.
export const BOOKSTORE_BUILT_IN_LIST_TYPES = ['latest', 'free', 'drm-free'] as const
export type BookstoreBuiltInListType = typeof BOOKSTORE_BUILT_IN_LIST_TYPES[number]

export const BOOKSTORE_DEFAULT_LIST_TYPE: BookstoreBuiltInListType = 'latest'

export function isBookstoreBuiltInListType(value: string): value is BookstoreBuiltInListType {
  return (BOOKSTORE_BUILT_IN_LIST_TYPES as readonly string[]).includes(value)
}

export function getBookstoreScopedKey(key: string, isLibrary: boolean) {
  return isLibrary ? `library:${key}` : key
}
