import * as v from 'valibot'
import { nftClassIdField } from '~/server/schemas/params'

export const TTSQuerySchema = v.object({
  text: v.pipe(
    v.string('MISSING_TEXT'),
    v.nonEmpty('MISSING_TEXT'),
  ),
  language: v.picklist(['en-US', 'zh-TW', 'zh-HK'], 'INVALID_LANGUAGE'),
  voice_id: v.pipe(
    v.string('INVALID_VOICE_ID'),
    v.nonEmpty('INVALID_VOICE_ID'),
  ),
  blocking: v.optional(v.string()),
  nft_class_id: v.optional(nftClassIdField),
  minimax_model: v.optional(v.picklist(['2.6', '2.8'])),
})
