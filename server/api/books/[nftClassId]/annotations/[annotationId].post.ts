import { H3Error } from 'h3'

import { AnnotationParamsSchema } from '~~/server/schemas/params'
import { AnnotationUpdateSchema } from '~~/shared/schemas/annotation'

export default defineEventHandler(async (event) => {
  const walletAddress = await requireUserWallet(event)

  const { nftClassId, annotationId } = await getValidatedRouterParams(event, createValidator(AnnotationParamsSchema))
  const body = await readValidatedBody(event, createValidator(AnnotationUpdateSchema))

  try {
    const annotation = await updateAnnotation(walletAddress, nftClassId, annotationId, body)
    if (!annotation) {
      throw createError({
        statusCode: 404,
        message: 'ANNOTATION_NOT_FOUND',
      })
    }
    return { annotation }
  }
  catch (error) {
    if (error instanceof H3Error && error.statusCode === 404) {
      throw error
    }
    console.error(`Failed to update annotation ${annotationId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_UPDATE_ANNOTATION',
    })
  }
})
