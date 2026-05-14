import { H3Error } from 'h3'

import { AnnotationParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const { nftClassId, annotationId } = await getValidatedRouterParams(event, createValidator(AnnotationParamsSchema))

  try {
    const deleted = await deleteAnnotation(walletAddress, nftClassId, annotationId)
    if (!deleted) {
      throw createError({
        statusCode: 404,
        message: 'ANNOTATION_NOT_FOUND',
      })
    }

    publishEvent(event, 'AnnotationDelete', {
      evmWallet: walletAddress,
      nftClassId,
      annotationId,
    })

    return { success: true }
  }
  catch (error) {
    if (error instanceof H3Error && error.statusCode === 404) {
      throw error
    }
    console.error(`Failed to delete annotation ${annotationId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_DELETE_ANNOTATION',
    })
  }
})
