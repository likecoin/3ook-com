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
    const [annotationsResult, nftClassResult] = await Promise.allSettled([
      getAnnotations(walletAddress, nftClassId),
      fetchLikeCoinNFTClassChainMetadataById(nftClassId),
    ])

    if (annotationsResult.status === 'rejected') {
      throw annotationsResult.reason
    }

    const metadata = nftClassResult.status === 'fulfilled' ? nftClassResult.value?.metadata : undefined
    const bookTitle = metadata?.name || nftClassId
    const collection = composeOpenAnnotationCollection({
      nftClassId,
      title: bookTitle,
      annotations: annotationsResult.value,
    })

    setHeader(event, 'Content-Type', 'application/ld+json')
    return collection
  }
  catch (error) {
    console.error(`Failed to export annotations for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_EXPORT_ANNOTATIONS',
    })
  }
})
