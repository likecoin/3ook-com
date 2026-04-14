import * as v from 'valibot'
import { uploadedBookIdField } from './uploaded-book'

export const nftClassIdField = v.pipe(
  v.string('MISSING_NFT_CLASS_ID'),
  v.nonEmpty('MISSING_NFT_CLASS_ID'),
  v.regex(/^0x[0-9a-fA-F]{40}$/, 'INVALID_NFT_CLASS_ID'),
)

export const NFTClassIdParamsSchema = v.object({
  nftClassId: nftClassIdField,
})

export const bookIdField = v.union([nftClassIdField, uploadedBookIdField])

export const BookIdParamsSchema = v.object({
  nftClassId: bookIdField,
})

export const TagIdParamsSchema = v.object({
  id: v.pipe(
    v.string('MISSING_TAG_ID'),
    v.nonEmpty('MISSING_TAG_ID'),
  ),
})

export const AnnotationParamsSchema = v.object({
  nftClassId: bookIdField,
  annotationId: v.pipe(
    v.string('MISSING_ANNOTATION_ID'),
    v.nonEmpty('MISSING_ANNOTATION_ID'),
  ),
})
