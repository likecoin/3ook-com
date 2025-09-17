export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const body = await readBody(event)
  const { nftClassId, priceIndex = 0 } = body
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nftClassId is required in body',
    })
  }

  const bookListItem = await addUserBookListItem(userWallet, nftClassId, priceIndex)
  return bookListItem
})
