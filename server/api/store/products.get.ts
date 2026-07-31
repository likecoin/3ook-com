import {
  BUILT_IN_LIST_PATHS,
  fetchBookstoreBookListing,
  fetchBookstoreCMSProductsByTagId,
  fetchBookstorePopularListing,
  respondWithBookstoreAPI,
} from '~~/server/utils/bookstore'
import { StoreProductsQuerySchema } from '~~/server/schemas/store'
import { checkIsEVMAddress } from '~~/shared/utils'
import {
  BOOKSTORE_BESTSELLING_LIST_TYPE,
  BOOKSTORE_DEFAULT_LIST_TYPE,
  BOOKSTORE_POPULAR_LIST_TYPE,
  isBookstoreBuiltInListType,
} from '~~/shared/utils/bookstore'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, createValidator(StoreProductsQuerySchema))
  const tag = query.tag || BOOKSTORE_DEFAULT_LIST_TYPE
  // Checked first: `popular` and `bestselling` are built-in list types, but need the class-id cursor fetcher.
  if (tag === BOOKSTORE_POPULAR_LIST_TYPE || tag === BOOKSTORE_BESTSELLING_LIST_TYPE) {
    return respondWithBookstoreAPI(
      event,
      opts => fetchBookstorePopularListing(BUILT_IN_LIST_PATHS[tag], opts),
      { validateCursor: checkIsEVMAddress, notFoundStatusCode: 501, notFoundStatusMessage: 'LIST_NOT_IMPLEMENTED' },
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
