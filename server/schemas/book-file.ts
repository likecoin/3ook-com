import * as v from 'valibot'
import { nftClassIdField } from '~~/server/schemas/params'

// Mirrors the upstream `/ebook-cors/` query contract so values pass straight
// through the proxy without re-mapping. Snake_case is deliberate here.
export const BookFileQuerySchema = v.object({
  class_id: nftClassIdField,
  nft_id: v.optional(v.string()),
  index: v.pipe(
    v.string('MISSING_INDEX'),
    v.regex(/^\d+$/, 'INVALID_INDEX'),
  ),
  custom_message: v.optional(v.picklist(['0', '1'], 'INVALID_CUSTOM_MESSAGE')),
})
