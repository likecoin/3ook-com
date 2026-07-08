import { BookListQuerySchema } from '~~/server/schemas/book-list'
import { fetchUserBookListItem } from '~~/server/utils/book-list'

export default defineEventHandler(async (event) => {
  const userWallet = await requireUserWallet(event)
  setHeader(event, 'cache-control', 'private')
  const query = await getValidatedQuery(event, createValidator(BookListQuerySchema))

  let priceIndex = 0
  if (query.price_index !== undefined) {
    priceIndex = Number(query.price_index)
    if (isNaN(priceIndex)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid price_index value in query',
      })
    }
  }

  try {
    const bookListItem = await fetchUserBookListItem(
      userWallet,
      query.nft_class_id,
      priceIndex,
    )

    if (!bookListItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Book list item not found',
      })
    }

    return bookListItem
  }
  catch (error) {
    console.error(error)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get book list item',
    })
  }
})
