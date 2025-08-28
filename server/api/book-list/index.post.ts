import { addUserBookListItem } from '~/server/utils/book-list'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const body = await readBody(event)
  const { nftClassId, priceIndex } = body
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nftClassId is required',
    })
  }
  if (priceIndex === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'priceIndex is required',
    })
  }

  try {
    const bookListItem = await addUserBookListItem(userWallet, nftClassId, priceIndex)
    return bookListItem
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add book list item',
    })
  }
})
