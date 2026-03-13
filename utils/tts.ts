export function sanitizeTTSText(text: string): string {
  if (!text) return ''
  return text
    .replace(/^\s*-{2,}\s*$/gm, '')
    .replace(/^\s*\.+\s*$/gm, '')
    .replace(/[*＊]/g, '')
    .replace(/[⋯︙…]+/g, '。')
    .replace(/[—─―︱⸺]+/g, '，')
    .replace(/﹁/g, '「')
    .replace(/﹂/g, '」')
    .replace(/﹃/g, '『')
    .replace(/﹄/g, '』')
}

export function isSpeakableText(text: string): boolean {
  return SPEAKABLE_REGEX.test(sanitizeTTSText(text))
}

const CLOSING_PUNCT = '[」』】》）)\u2019\u201D]'
const SENTENCE_REGEX = new RegExp(`([.!?。！？]${CLOSING_PUNCT}*[\\s\\u200B]*)`)
const CLAUSE_REGEX = new RegExp(`([;；：，、]${CLOSING_PUNCT}*[\\s\\u200B]*)`)
const SPEAKABLE_REGEX = /[\p{L}\p{N}]/u
const MAX_SEGMENT_LENGTH = 100

function mergeParts(parts: string[]): string[] {
  const result: string[] = []
  let current = ''
  for (const part of parts) {
    const trimmed = part.replace(/[\s\u200B]+/g, ' ').trim()
    if (!trimmed) continue
    if (trimmed.length === 1 || current.length + trimmed.length < MAX_SEGMENT_LENGTH) {
      current += trimmed
    }
    else {
      if (SPEAKABLE_REGEX.test(current)) result.push(current)
      current = trimmed
    }
  }
  if (SPEAKABLE_REGEX.test(current)) result.push(current)
  return result
}

export function splitTextIntoSegments(text: string): string[] {
  if (!text) return []

  const sanitized = sanitizeTTSText(text)

  // Split at sentence-ending punctuation first (preferred boundaries)
  const sentences = mergeParts(sanitized.split(SENTENCE_REGEX))

  // Sub-split long segments at clause-level punctuation (，、；：;)
  const result: string[] = []
  for (const sentence of sentences) {
    if (sentence.length <= MAX_SEGMENT_LENGTH) {
      result.push(sentence)
      continue
    }
    result.push(...mergeParts(sentence.split(CLAUSE_REGEX)))
  }

  return result
}

export const TTS_CONFIG_KEY = 'tts-config'

const TTS_CONFIG_KEY_SUFFIX_LIST = [
  'voice',
  'playback-rate',
] as const

export type TTSConfigKeySuffix = (typeof TTS_CONFIG_KEY_SUFFIX_LIST)[number]

export function getTTSConfigKeySuffixes() {
  return TTS_CONFIG_KEY_SUFFIX_LIST
}

export function getTTSConfigKeyWithSuffix(key: string, suffix: TTSConfigKeySuffix) {
  return `${key}-${suffix}`
}
