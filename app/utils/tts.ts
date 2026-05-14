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

/**
 * Merge tokenized parts (from a punctuation split) into segments that are as
 * uniform in length as possible, while always breaking at a punctuation
 * boundary. Uniform segments reduce variance in TTS API generation time, which
 * smooths streaming playback.
 */
function mergeParts(parts: string[]): string[] {
  // Keep every entry speakable so the balanced splitter can't strand a
  // punctuation-only segment, which would be filtered and break the
  // `result.join('') === text` integrity invariant.
  const cleaned: string[] = []
  let pendingPrefix = ''
  for (const part of parts) {
    const trimmed = part.replace(/[\s\u200B]+/g, ' ').trim()
    if (!trimmed) continue
    if (SPEAKABLE_REGEX.test(trimmed)) {
      cleaned.push(pendingPrefix + trimmed)
      pendingPrefix = ''
    }
    else if (cleaned.length > 0) {
      cleaned[cleaned.length - 1] += trimmed
    }
    else {
      pendingPrefix += trimmed
    }
  }
  const n = cleaned.length
  if (!n) return []

  let totalLength = 0
  let maxPartLen = 0
  for (const p of cleaned) {
    totalLength += p.length
    if (p.length > maxPartLen) maxPartLen = p.length
  }

  const prefix: number[] = new Array(n + 1)
  prefix[0] = 0
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i]! + cleaned[i]!.length

  // Place each of k-1 boundaries at whichever part boundary lands closest to
  // an evenly-spaced target (j * totalLength / k). Because prefix sums are
  // monotonic, |prefix[i] - goal| is unimodal, so the search short-circuits
  // as soon as distance stops shrinking.
  const buildSegments = (k: number): { segments: string[], maxLen: number } => {
    const target = totalLength / k
    const splits: number[] = [0]
    for (let j = 1; j < k; j++) {
      const goal = j * target
      const prev = splits[splits.length - 1]!
      const maxIdx = n - (k - j)
      let best = prev + 1
      let bestDiff = Math.abs(prefix[best]! - goal)
      for (let i = prev + 2; i <= maxIdx; i++) {
        const diff = Math.abs(prefix[i]! - goal)
        if (diff < bestDiff) {
          best = i
          bestDiff = diff
        }
        else {
          break
        }
      }
      splits.push(best)
    }
    splits.push(n)

    const segments: string[] = []
    let maxLen = 0
    for (let j = 0; j < splits.length - 1; j++) {
      const len = prefix[splits[j + 1]!]! - prefix[splits[j]!]!
      if (len > maxLen) maxLen = len
      segments.push(cleaned.slice(splits[j]!, splits[j + 1]!).join(''))
    }
    return { segments, maxLen }
  }

  const initialK = Math.min(n, Math.ceil(totalLength / MAX_SEGMENT_LENGTH))

  // If a single atomic part is already larger than MAX, no amount of
  // re-partitioning fits it. Return the initialK split; when called with
  // sentence parts, splitTextIntoSegments retries via CLAUSE_REGEX. At the
  // clause level there is no finer delimiter, so oversize segments pass
  // through — the TTS backend must tolerate them.
  if (maxPartLen > MAX_SEGMENT_LENGTH) return buildSegments(initialK).segments

  for (let k = initialK; k <= n; k++) {
    const result = buildSegments(k)
    if (result.maxLen <= MAX_SEGMENT_LENGTH) return result.segments
  }
  return buildSegments(n).segments
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
