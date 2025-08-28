export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const body = await readBody(event)
  const { nftClassId, priceIndex } = body
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nftClassId is required in body',
    })
  }
  if (priceIndex === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'priceIndex is required in body',
    })
  }

  try {
    await deleteUserBookListItem(userWallet, nftClassId, priceIndex)
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove book from list',
    })
  }
})
