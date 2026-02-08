export function splitTextIntoSegments(text: string): string[] {
  if (!text) return []
  const punctuationRegex = /([.!?;*。！？；：，、＊][\s\u200B]*)/
  const segments = text.split(punctuationRegex)
  const result: string[] = []

  let currentSegment = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = sanitizeTTSText(segments[i]?.trim() || '')
    if (!segment) continue
    if (segment.length === 1 || currentSegment.length + segment.length < 100) {
      currentSegment += segment
    }
    else {
      if (currentSegment) {
        result.push(currentSegment)
      }
      currentSegment = segment
    }
  }

  if (currentSegment) {
    result.push(currentSegment)
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
