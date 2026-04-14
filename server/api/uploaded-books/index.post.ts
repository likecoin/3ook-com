import { randomUUID } from 'node:crypto'
import type { InitUploadedBookResponse } from '~/shared/types/uploaded-book'
import {
  UPLOADED_BOOK_CONTENT_TYPE_TO_MIME,
  UPLOADED_BOOK_COVER_EXT,
  UPLOADED_BOOK_COVER_MIME_TYPE,
  UPLOADED_BOOK_ID_PREFIX,
  UPLOADED_BOOK_MIME_TO_CONTENT_TYPE,
} from '~/shared/utils/uploaded-book'
import { InitUploadedBookBodySchema } from '~/server/schemas/uploaded-book'

export default defineEventHandler(async (event): Promise<InitUploadedBookResponse> => {
  const wallet = await requireUserWallet(event)
  const session = await requireUserSession(event)
  if (!session.user.isLikerPlus) {
    throw createError({ statusCode: 402, message: 'REQUIRE_LIKER_PLUS' })
  }

  const { mimeType, fileSize, coverSize } = await readValidatedBody(event, createValidator(InitUploadedBookBodySchema))

  const quota = await getUploadedBooksQuota(wallet)
  if (quota.count >= quota.maxCount) {
    throw createError({ statusCode: 400, message: 'UPLOAD_QUOTA_EXCEEDED' })
  }

  const contentType = UPLOADED_BOOK_MIME_TO_CONTENT_TYPE[mimeType]
  if (!contentType) {
    throw createError({ statusCode: 400, message: 'INVALID_FILE_FORMAT' })
  }
  const bookId = `${UPLOADED_BOOK_ID_PREFIX}${randomUUID()}`
  const storagePath = getUploadedBookStoragePath(wallet, bookId, contentType)

  // Mint the main upload URL and (optionally) the cover URL in parallel —
  // both are independent GCS calls, no point serialising them.
  const [{ uploadURL, expiresAt }, coverResult] = await Promise.all([
    createUploadedBookSignedUploadURL(storagePath, mimeType, fileSize),
    coverSize
      ? createUploadedBookSignedUploadURL(
          getUploadedBookCoverStoragePath(wallet, bookId, UPLOADED_BOOK_COVER_EXT),
          UPLOADED_BOOK_COVER_MIME_TYPE,
          coverSize,
        )
      : Promise.resolve(undefined),
  ])

  return {
    bookId,
    uploadURL,
    mimeType: UPLOADED_BOOK_CONTENT_TYPE_TO_MIME[contentType],
    contentType,
    expiresAt,
    ...(coverResult && { coverUploadURL: coverResult.uploadURL }),
  }
})
