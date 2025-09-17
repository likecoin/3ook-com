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

  await deleteUserBookListItem(userWallet, nftClassId, priceIndex)
})
