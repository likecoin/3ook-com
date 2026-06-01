import { isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'

// Built-in (non-curated) book listings
export default defineEventHandler((event) => {
  const type = getRouterParam(event, 'type') || ''
  if (!isBookstoreBuiltInListType(type)) {
    throw createError({ statusCode: 404, statusMessage: 'LIST_NOT_FOUND' })
  }
  // A 404 from upstream here means the backend /list* path isn't deployed yet —
  // surface it as 501 so clients don't confuse it with the local "unknown type" 404 above.
  return respondWithBookstoreAPI(
    event,
    opts => fetchBookstoreBookListing(BUILT_IN_LIST_PATHS[type], opts),
    { notFoundStatusCode: 501, notFoundStatusMessage: 'LIST_NOT_IMPLEMENTED' },
  )
})
