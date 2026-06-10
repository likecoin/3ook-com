import * as v from 'valibot'

const PaginationFields = {
  limit: v.optional(v.union([v.string(), v.array(v.string())])),
  offset: v.optional(v.union([v.string(), v.array(v.string())])),
}

// Library tab passes `library=1` to restrict search/genre to Plus-reading titles.
const PlusReadingField = {
  library: v.optional(v.union([v.string(), v.array(v.string())])),
}

export const StoreStakingBooksQuerySchema = v.object({
  sort_by: v.optional(v.union([v.string(), v.array(v.string())])),
  sort_order: v.optional(v.union([v.string(), v.array(v.string())])),
  // Collective indexer pagination cursor (`pagination.key`); request-specific.
  key: v.optional(v.union([v.string(), v.array(v.string())])),
  // Cursor-based pagination — `limit` only, no offset.
  limit: PaginationFields.limit,
})

export const StoreProductsQuerySchema = v.object({
  tag: v.pipe(
    v.optional(v.union([v.string(), v.array(v.string())])),
    v.transform(val => (Array.isArray(val) ? val[0] : val)),
  ),
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
  ...PlusReadingField,
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
  ...PlusReadingField,
})
