export function sanitizeTTSText(text: string): string {
  if (!text) return ''
  return text
    // Normalize fullwidth ASCII (U+FF01–U+FF5E) to basic ASCII
    .replace(/[\uFF01-\uFF5E]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/^\s*-{2,}\s*$/gm, '')
    .replace(/^\s*\.+\s*$/gm, '')
    .replace(/[*]/g, '')
    .replace(/[⋯︙…]+/g, '。')
    .replace(/[—─―︱⸺]+/g, ',')
    .replace(/﹁/g, '「')
    .replace(/﹂/g, '」')
    .replace(/﹃/g, '『')
    .replace(/﹄/g, '』')
}

export function isSpeakableText(text: string): boolean {
  return SPEAKABLE_REGEX.test(sanitizeTTSText(text))
}

const CLOSING_PUNCT = '[」』】》）)\u2019\u201D]'
const SENTENCE_REGEX = new RegExp(`([.!?。！？…⋯︙]${CLOSING_PUNCT}*[\\s\\u200B]*)`)
const CLAUSE_REGEX = new RegExp(`([;:,，；：、—─―︱⸺]${CLOSING_PUNCT}*[\\s\\u200B]*)`)
const SPEAKABLE_REGEX = /[\p{L}\p{N}]/u
const MAX_SEGMENT_LENGTH = 100
const MIN_SEGMENT_LENGTH = 15

function mergeParts(parts: string[]): string[] {
  const result: string[] = []
  let current = ''
  for (const part of parts) {
    const trimmed = part.replace(/[\s\u200B]+/g, ' ').trim()
    if (!trimmed) continue
    if (
      trimmed.length === 1
      || current.length + trimmed.length < MAX_SEGMENT_LENGTH
      || (trimmed.length < MIN_SEGMENT_LENGTH && current.length + trimmed.length <= MAX_SEGMENT_LENGTH * 1.5)
    ) {
      current += trimmed
    }
    else {
      if (SPEAKABLE_REGEX.test(current)) result.push(current)
      current = trimmed
    }
  }
  if (SPEAKABLE_REGEX.test(current)) {
    // Merge short trailing text into the previous segment
    if (current.length < MIN_SEGMENT_LENGTH && result.length > 0
      && result[result.length - 1]!.length + current.length <= MAX_SEGMENT_LENGTH) {
      result[result.length - 1] += current
    }
    else {
      result.push(current)
    }
  }
  return result
}

export function splitTextIntoSegments(text: string): string[] {
  if (!text) return []

  // Split at sentence-ending punctuation first (preferred boundaries)
  const sentences = mergeParts(text.split(SENTENCE_REGEX))

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

/**
 * Merge short TTSSegments with adjacent segments within the same section.
 * Reduces the number of TTS API calls for short text fragments.
 */
export function mergeShortTTSSegments(segments: TTSSegment[]): TTSSegment[] {
  if (segments.length <= 1) return segments

  const result: TTSSegment[] = []

  for (const segment of segments) {
    const prev = result[result.length - 1]
    if (
      prev
      && prev.sectionIndex === segment.sectionIndex
      && prev.cfi === segment.cfi
      && prev.elementIndex === segment.elementIndex
      && (prev.text.length < MIN_SEGMENT_LENGTH || segment.text.length < MIN_SEGMENT_LENGTH)
      && prev.text.length + segment.text.length <= MAX_SEGMENT_LENGTH
    ) {
      prev.text += segment.text
    }
    else {
      result.push(segment)
    }
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
