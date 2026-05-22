import * as v from 'valibot'

const PaginationFields = {
  limit: v.optional(v.union([v.string(), v.array(v.string())])),
  offset: v.optional(v.union([v.string(), v.array(v.string())])),
}

export const StoreProductsQuerySchema = v.object({
  tag: v.optional(v.union([v.string(), v.array(v.string())])),
  // Bypass the page-1 cache to mint a fresh Airtable pagination cursor.
  live: v.optional(v.union([v.string(), v.array(v.string())])),
  ...PaginationFields,
})

export const StoreSearchQuerySchema = v.object({
  q: v.pipe(
    v.union([v.string(), v.array(v.string())]),
    v.check(
      val => !!(Array.isArray(val) ? val[0] : val),
      'SEARCH_TERM_REQUIRED',
    ),
  ),
  ...PaginationFields,
})

export const StoreGenreQuerySchema = v.object({
  q: v.pipe(
    v.union([v.string(), v.array(v.string())]),
    v.check(
      val => !!(Array.isArray(val) ? val[0] : val),
      'GENRE_REQUIRED',
    ),
  ),
  ...PaginationFields,
})

export const StoreTagsQuerySchema = v.object({
  ...PaginationFields,
})
