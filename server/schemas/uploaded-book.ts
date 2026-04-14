import * as v from 'valibot'
import {
  UPLOADED_BOOK_ALLOWED_TYPES,
  UPLOADED_BOOK_ID_PREFIX,
  UPLOADED_BOOK_MAX_COVER_SIZE,
  UPLOADED_BOOK_MAX_FILE_SIZE,
} from '~/shared/utils/uploaded-book'

export const uploadedBookIdField = v.pipe(
  v.string('MISSING_BOOK_ID'),
  v.nonEmpty('MISSING_BOOK_ID'),
  v.regex(
    new RegExp(`^${UPLOADED_BOOK_ID_PREFIX}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`),
    'INVALID_BOOK_ID',
  ),
)

export const UploadedBookIdParamsSchema = v.object({
  bookId: uploadedBookIdField,
})

export const UPLOADED_BOOK_MAX_NAME_LENGTH = 200

const coverFileSizeField = v.pipe(
  v.number('INVALID_COVER_SIZE'),
  v.integer('INVALID_COVER_SIZE'),
  v.minValue(1, 'INVALID_COVER_SIZE'),
  v.maxValue(UPLOADED_BOOK_MAX_COVER_SIZE, 'COVER_TOO_LARGE'),
)

export const InitUploadedBookBodySchema = v.object({
  mimeType: v.pipe(
    v.string('INVALID_FILE_FORMAT'),
    v.picklist(UPLOADED_BOOK_ALLOWED_TYPES, 'INVALID_FILE_FORMAT'),
  ),
  fileSize: v.pipe(
    v.number('INVALID_FILE_SIZE'),
    v.integer('INVALID_FILE_SIZE'),
    v.minValue(1, 'INVALID_FILE_SIZE'),
    v.maxValue(UPLOADED_BOOK_MAX_FILE_SIZE, 'FILE_TOO_LARGE'),
  ),
  coverSize: v.optional(coverFileSizeField),
})

export const FinalizeUploadedBookBodySchema = v.object({
  contentType: v.picklist(['epub', 'pdf'] as const, 'INVALID_FILE_FORMAT'),
  name: v.pipe(
    v.string('MISSING_NAME'),
    v.trim(),
    v.nonEmpty('MISSING_NAME'),
    v.maxLength(UPLOADED_BOOK_MAX_NAME_LENGTH, 'NAME_TOO_LONG'),
  ),
  hasCover: v.optional(v.boolean(), false),
})
