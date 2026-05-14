import * as v from 'valibot'
import { bookIdField } from '~~/server/schemas/params'
import { TTS_PREVIEW_NFT_CLASS_ID } from '~~/shared/utils/tts-sig'

export const TTS_MAX_TEXT_LENGTH = 2000

export const TTSQuerySchema = v.object({
  text: v.pipe(
    v.string('MISSING_TEXT'),
    v.nonEmpty('MISSING_TEXT'),
    v.maxLength(TTS_MAX_TEXT_LENGTH, 'TEXT_TOO_LONG'),
  ),
  language: v.picklist(['en-US', 'zh-TW', 'zh-HK'], 'INVALID_LANGUAGE'),
  voice_id: v.pipe(
    v.string('INVALID_VOICE_ID'),
    v.nonEmpty('INVALID_VOICE_ID'),
  ),
  blocking: v.optional(v.string()),
  nft_class_id: v.union([bookIdField, v.literal(TTS_PREVIEW_NFT_CLASS_ID)]),
  sig: v.pipe(
    v.string('MISSING_SIG'),
    v.nonEmpty('MISSING_SIG'),
  ),
})

export const TTSSampleQuerySchema = v.object({
  language: v.picklist(['en-US', 'zh-TW', 'zh-HK'], 'INVALID_LANGUAGE'),
  voice_id: v.pipe(
    v.string('INVALID_VOICE_ID'),
    v.nonEmpty('INVALID_VOICE_ID'),
  ),
  from: v.optional(v.string()),
  seg: v.optional(v.pipe(
    v.string(),
    v.nonEmpty('INVALID_SEG'),
    v.transform(Number),
    v.number('INVALID_SEG'),
    v.integer('INVALID_SEG'),
    v.minValue(0, 'INVALID_SEG'),
  )),
})
