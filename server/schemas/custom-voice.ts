import * as v from 'valibot'

export const CUSTOM_VOICE_ALLOWED_LANGUAGES = ['zh-HK', 'zh-TW'] as const
export const CUSTOM_VOICE_ALLOWED_VOICE_LANGUAGES = ['zh-HK', 'zh-TW', 'en-US'] as const
export const CUSTOM_VOICE_ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']
export const CUSTOM_VOICE_ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png']
export const CUSTOM_VOICE_MAX_AUDIO_SIZE = 20 * 1024 * 1024 // 20MB
export const CUSTOM_VOICE_MAX_PROMPT_AUDIO_SIZE = 2 * 1024 * 1024 // 2MB
export const CUSTOM_VOICE_MAX_PROMPT_TEXT_LENGTH = 500
export const CUSTOM_VOICE_MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

export const CustomVoicePatchSchema = v.object({
  voiceLanguage: v.picklist(CUSTOM_VOICE_ALLOWED_LANGUAGES, 'INVALID_VOICE_LANGUAGE'),
})

export const CustomVoiceFieldsSchema = v.object({
  voiceName: v.pipe(
    v.string('MISSING_VOICE_NAME'),
    v.nonEmpty('MISSING_VOICE_NAME'),
  ),
  voiceLanguage: v.optional(v.picklist([...CUSTOM_VOICE_ALLOWED_VOICE_LANGUAGES], 'INVALID_VOICE_LANGUAGE')),
  promptText: v.optional(v.pipe(
    v.string('MISSING_PROMPT_TEXT'),
    v.nonEmpty('MISSING_PROMPT_TEXT'),
    v.maxLength(CUSTOM_VOICE_MAX_PROMPT_TEXT_LENGTH, 'PROMPT_TEXT_TOO_LONG'),
  )),
})
