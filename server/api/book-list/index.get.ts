import { fetchUserBookListItem } from '~/server/utils/book-list'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const query = getQuery(event)
  const nftClassId = query.nft_class_id as string
  const priceIndex = Number(query.price_index) || 0

  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nftClassId is required',
    })
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
