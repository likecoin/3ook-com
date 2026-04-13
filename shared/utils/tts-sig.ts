export const TTS_PREVIEW_NFT_CLASS_ID = 'custom_voice_preview'

export const AFFILIATE_VOICE_PREFIX = 'affiliate:'

export function encodeAffiliateVoiceId(voiceSlot: string): string {
  return `${AFFILIATE_VOICE_PREFIX}${voiceSlot}`
}

export function isAffiliateVoiceId(voiceId: string): boolean {
  return voiceId.startsWith(AFFILIATE_VOICE_PREFIX)
}

export function decodeAffiliateVoiceId(voiceId: string): string | undefined {
  return isAffiliateVoiceId(voiceId) ? voiceId.slice(AFFILIATE_VOICE_PREFIX.length) : undefined
}

export function computeTTSTextSig(params: {
  token: string
  voiceId: string
  language: string
  nftClassId: string
  text: string
}): string {
  const { token, voiceId, language, nftClassId, text } = params
  return cyrb53(`${token}:${voiceId}:${language}:${nftClassId.toLowerCase()}:${text}`)
}

// Pre-voice/language-binding sig shape. Server-only during rollout so PWA-
// cached and long-lived client tabs keep working until they reload. Remove
// this helper (and its call site) once the TTSLegacySig analytics event has
// drained to zero — typically 1–2 weeks after deploy.
export function computeLegacyTTSTextSig(token: string, nftClassId: string, text: string): string {
  return cyrb53(`${token}:${nftClassId.toLowerCase()}:${text}`)
}

function cyrb53(str: string): string {
  let h1 = 0x300CDEED
  let h2 = 0xDEF1B00C
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
