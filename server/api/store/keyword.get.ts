import {
  BUILT_IN_LIST_PATHS,
  fetchBookstoreBookListing,
  respondWithBookstoreAPI,
} from '~~/server/utils/bookstore'
import { StoreKeywordQuerySchema } from '~~/server/schemas/store'

export default defineEventHandler(async (event) => {
  const { keyword } = await getValidatedQuery(event, createValidator(StoreKeywordQuerySchema))
  return respondWithBookstoreAPI(
    event,
    opts => fetchBookstoreBookListing(BUILT_IN_LIST_PATHS.latest, { ...opts, keyword }),
  )
})
