import { fetchUserBookListItem } from '~/server/utils/book-list'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const query = getQuery(event)
  const nftClassId = query.nft_class_id as string
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nft_class_id is required in query',
    })
  }

  let priceIndex = 0
  if (typeof query.price_index !== 'undefined') {
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
      nftClassId,
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
