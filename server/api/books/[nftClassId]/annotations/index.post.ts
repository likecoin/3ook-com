import { GrpcStatus } from 'firebase-admin/firestore'

import { ANNOTATION_COLORS, ANNOTATION_NOTE_MAX_LENGTH, ANNOTATION_TEXT_MAX_LENGTH } from '~/constants/annotations'

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

  let body: AnnotationCreateData
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

  if (!body.cfi || typeof body.cfi !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'MISSING_OR_INVALID_CFI',
    })
  }

  if (!body.text || typeof body.text !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'MISSING_OR_INVALID_TEXT',
    })
  }

  if (body.text.length > ANNOTATION_TEXT_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      message: 'TEXT_TOO_LONG',
    })
  }

  if (!body.color || !ANNOTATION_COLORS.includes(body.color)) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_OR_INVALID_COLOR',
    })
  }

  if (
    body.note !== undefined && (
      typeof body.note !== 'string'
      || body.note.length > ANNOTATION_NOTE_MAX_LENGTH
    )
  ) {
    throw createError({
      statusCode: 400,
      message: 'INVALID_NOTE',
    })
  }

  if (body.chapterTitle !== undefined && typeof body.chapterTitle !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'INVALID_CHAPTER_TITLE',
    })
  }

  try {
    const annotation = await createAnnotation(walletAddress, nftClassId, {
      cfi: body.cfi,
      text: body.text,
      color: body.color,
      note: body.note,
      chapterTitle: body.chapterTitle,
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
