import { StoreForYouQuerySchema } from '~~/server/schemas/store'
import { FOR_YOU_DEFAULT_PAGE_SIZE } from '~~/server/utils/recommendation'

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const query = await getValidatedQuery(event, createValidator(StoreForYouQuerySchema))

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  const seed = query.seed || undefined
  const isLibrary = parseIsLibraryQuery(query.library)
  // parseBookstorePageSize turns a missing limit into the max page size; the feed
  // wants a smaller default, so only parse when the client actually sent one.
  const limit = query.limit === undefined
    ? FOR_YOU_DEFAULT_PAGE_SIZE
    : parseBookstorePageSize(query.limit)

  try {
    return await fetchForYouRecommendations(wallet, { isLibrary, seed, limit })
  }
  catch (error) {
    console.error('Failed to get for-you products:', error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_FOR_YOU_PRODUCTS',
    })
  }
})
