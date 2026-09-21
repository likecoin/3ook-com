import {
  BUILT_IN_LIST_PATHS,
  fetchBookstoreBookListing,
  fetchBookstoreCMSProductsByTagId,
  fetchBookstorePopularListing,
  parseIsLibraryQuery,
  respondWithBookstoreAPI,
} from '~~/server/utils/bookstore'
import { StoreProductsQuerySchema } from '~~/server/schemas/store'
import { checkIsEVMAddress } from '~~/shared/utils'
import {
  BOOKSTORE_BESTSELLING_LIST_TYPE,
  BOOKSTORE_FREE_LIST_TYPE,
  BOOKSTORE_LATEST_LIST_TYPE,
  BOOKSTORE_POPULAR_LIST_TYPE,
  isBookstoreBuiltInListType,
} from '~~/shared/utils/bookstore'

// Ranked listings page on a class-id cursor, so they share the cursor check and the
// not-implemented mapping.
const RANKED_LIST_RESPOND_OPTIONS = {
  validateCursor: checkIsEVMAddress,
  notFoundStatusCode: 501,
  notFoundStatusMessage: 'LIST_NOT_IMPLEMENTED',
} as const

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, createValidator(StoreProductsQuerySchema))
  const tag = query.tag || BOOKSTORE_LATEST_LIST_TYPE
  // Checked first: `popular` and `bestselling` are built-in list types, but need the class-id cursor fetcher.
  if (tag === BOOKSTORE_POPULAR_LIST_TYPE || tag === BOOKSTORE_BESTSELLING_LIST_TYPE) {
    return respondWithBookstoreAPI(
      event,
      opts => fetchBookstorePopularListing(BUILT_IN_LIST_PATHS[tag], opts),
      RANKED_LIST_RESPOND_OPTIONS,
    )
  }
  // The library's free tab is the reading ranking narrowed to free books, so it asks the
  // popular endpoint rather than `/list/free` and speaks its class-id cursor dialect. The
  // store's free tab stays on the upstream timestamp order.
  if (tag === BOOKSTORE_FREE_LIST_TYPE && parseIsLibraryQuery(query.library)) {
    return respondWithBookstoreAPI(
      event,
      opts => fetchBookstorePopularListing(BUILT_IN_LIST_PATHS[BOOKSTORE_POPULAR_LIST_TYPE], { ...opts, filter: BOOKSTORE_FREE_LIST_TYPE }),
      RANKED_LIST_RESPOND_OPTIONS,
    )
  }
  if (isBookstoreBuiltInListType(tag)) {
    return respondWithBookstoreAPI(
      event,
      opts => fetchBookstoreBookListing(BUILT_IN_LIST_PATHS[tag], opts),
      { notFoundStatusCode: 501, notFoundStatusMessage: 'LIST_NOT_IMPLEMENTED' },
    )
  }
  return respondWithBookstoreAPI(
    event,
    opts => fetchBookstoreCMSProductsByTagId(tag, opts),
    { notFoundStatusMessage: 'TAG_NOT_FOUND' },
  )
})
