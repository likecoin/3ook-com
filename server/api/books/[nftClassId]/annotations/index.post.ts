import { GrpcStatus } from 'firebase-admin/firestore'

import { BookIdParamsSchema } from '~/server/schemas/params'
import { AnnotationCreateSchema } from '~/shared/schemas/annotation'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(BookIdParamsSchema))
  const body = await readValidatedBody(event, createValidator(AnnotationCreateSchema))

  try {
    const annotation = await createAnnotation(walletAddress, nftClassId, {
      cfi: body.cfi,
      text: body.text,
      color: body.color,
      note: body.note,
      chapterTitle: body.chapterTitle,
    })

    publishEvent(event, 'AnnotationCreate', {
      evmWallet: walletAddress,
      nftClassId,
    })

    return { annotation }
  }
  catch (error) {
    if (error != null && typeof error === 'object' && 'code' in error && error.code === GrpcStatus.ALREADY_EXISTS) {
      throw createError({
        statusCode: 409,
        message: 'ANNOTATION_ALREADY_EXISTS',
      })
    }
    console.error(`Failed to create annotation for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_CREATE_ANNOTATION',
    })
  }
})
