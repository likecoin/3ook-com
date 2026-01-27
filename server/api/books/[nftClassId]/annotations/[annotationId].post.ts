import { H3Error } from 'h3'

import { ANNOTATION_COLORS, ANNOTATION_NOTE_MAX_LENGTH } from '~/constants/annotations'

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

  const annotationId = getRouterParam(event, 'annotationId')
  if (!annotationId) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_ANNOTATION_ID',
    })
  }

  let body: AnnotationUpdateData
  try {
    body = await readBody(event)
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 400,
      message: 'INVALID_BODY',
    })
  }

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'INVALID_BODY',
    })
  }

  if (body.color === undefined && body.note === undefined) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_UPDATE_FIELDS',
    })
  }

  if (body.color !== undefined && !ANNOTATION_COLORS.includes(body.color)) {
    throw createError({
      statusCode: 400,
      message: 'INVALID_COLOR',
    })
  }

  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > ANNOTATION_NOTE_MAX_LENGTH)) {
    throw createError({
      statusCode: 400,
      message: 'INVALID_NOTE',
    })
  }

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
