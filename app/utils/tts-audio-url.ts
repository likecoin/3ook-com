import type { AffiliateVoiceData, CustomVoiceData } from '~~/shared/types/custom-voice'
import { computeTTSTextSig, decodeAffiliateVoiceId, isAffiliateVoiceId } from '~~/shared/utils/tts-sig'

export function parseLanguageVoice(languageVoice: string): { language: string, voiceId: string } {
  const [language = '', ...voiceIdParts] = languageVoice.split('_')
  return { language, voiceId: voiceIdParts.join('_') }
}

export function resolvePrivateVoiceLanguage({ bookLanguage, voiceLanguage }: {
  bookLanguage?: string
  voiceLanguage?: string
}): string {
  const lang = bookLanguage || 'zh-HK'
  return lang.toLowerCase().startsWith('en') ? 'en-US' : (voiceLanguage || 'zh-HK')
}

export interface TTSAudioURLContext {
  nftClassId: string
  languageVoice: string
  bookLanguage?: string
  // Per-user signing token, required for private voices (custom + affiliate).
  ttsKey?: string
  // Native bridge requests opt into blocking generation.
  isBlocking?: boolean
  affiliateVoices?: AffiliateVoiceData[]
  customVoice?: CustomVoiceData | null
}

function appendCommonParams(
  params: URLSearchParams,
  { text, voiceId, language, isPrivateVoice }: {
    text: string
    voiceId: string
    language: string
    isPrivateVoice: boolean
  },
  context: TTSAudioURLContext,
) {
  params.set('nft_class_id', context.nftClassId)
  // System voices use an empty-token sig so URLs converge across users,
  // enabling shared Cloudflare edge caching. Private voices (custom +
  // affiliate) use a per-user ttsKey so URLs stay unique per wallet — the
  // edge cannot serve one user's cloned/exclusive voice audio to another.
  const sigToken = isPrivateVoice ? (context.ttsKey || '') : ''
  params.set('sig', computeTTSTextSig({ token: sigToken, voiceId, language, nftClassId: context.nftClassId, text }))
  if (context.isBlocking) {
    params.set('blocking', '1')
  }
}

// Builds the `/api/reader/tts` URL for a sanitized segment text. Parameter
// order is part of the CDN cache key — keep it stable.
export function buildTTSAudioURL(sanitizedText: string, context: TTSAudioURLContext): string {
  const { languageVoice } = context

  if (isAffiliateVoiceId(languageVoice)) {
    const slot = decodeAffiliateVoiceId(languageVoice)
    const voice = slot
      ? context.affiliateVoices?.find(v => v.id === slot)
      : undefined
    const language = resolvePrivateVoiceLanguage({
      bookLanguage: context.bookLanguage,
      voiceLanguage: voice?.language,
    })
    const params = new URLSearchParams({
      text: sanitizedText,
      language,
      voice_id: languageVoice,
    })
    appendCommonParams(params, { text: sanitizedText, voiceId: languageVoice, language, isPrivateVoice: true }, context)
    return `/api/reader/tts?${params.toString()}`
  }

  if (languageVoice === 'custom') {
    const language = resolvePrivateVoiceLanguage({
      bookLanguage: context.bookLanguage,
      voiceLanguage: context.customVoice?.voiceLanguage,
    })
    const params = new URLSearchParams({
      text: sanitizedText,
      language,
      voice_id: 'custom',
    })
    appendCommonParams(params, { text: sanitizedText, voiceId: 'custom', language, isPrivateVoice: true }, context)
    if (context.customVoice?.updatedAt) {
      params.set('_t', context.customVoice.updatedAt.toString())
    }
    return `/api/reader/tts?${params.toString()}`
  }

  const parsed = parseLanguageVoice(languageVoice)
  const language = parsed.language || 'zh-HK'
  const voiceId = parsed.voiceId
  const params = new URLSearchParams({
    text: sanitizedText,
    language,
    voice_id: voiceId,
  })
  appendCommonParams(params, { text: sanitizedText, voiceId, language, isPrivateVoice: false }, context)
  return `/api/reader/tts?${params.toString()}`
}
