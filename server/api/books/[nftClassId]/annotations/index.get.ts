export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const nftClassId = getRouterParam(event, 'nftClassId')
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_NFT_CLASS_ID',
    })
  }

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  try {
    const annotations = await getAnnotations(walletAddress, nftClassId)
    return { annotations }
  }
  catch (error) {
    console.error(`Failed to get annotations for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_ANNOTATIONS',
    })
  }
})
