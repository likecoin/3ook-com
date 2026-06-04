import {
  BUILT_IN_LIST_PATHS,
  fetchBookstoreBookListing,
  fetchBookstoreCMSProductsByTagId,
  respondWithBookstoreAPI,
} from '~~/server/utils/bookstore'
import { StoreProductsQuerySchema } from '~~/server/schemas/store'
import { BOOKSTORE_DEFAULT_LIST_TYPE, isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, createValidator(StoreProductsQuerySchema))
  const tag = query.tag || BOOKSTORE_DEFAULT_LIST_TYPE
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
