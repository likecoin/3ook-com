import { describe, expect, it } from 'vitest'
import {
  sanitizeTTSText,
  isSpeakableText,
  splitTextIntoSegments,
  mergeShortTTSSegments,
  getTTSConfigKeySuffixes,
  getTTSConfigKeyWithSuffix,
  TTS_CONFIG_KEY,
} from '~/utils/tts'
import {
  computeLegacyTTSTextSig,
  computeTTSTextSig,
} from '~/shared/utils/tts-sig'

describe('sanitizeTTSText', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeTTSText('')).toBe('')
  })

  // Regression: 343dea3d — fullwidth ASCII caused TTS mispronunciation
  it('normalizes fullwidth ASCII to basic ASCII', () => {
    expect(sanitizeTTSText('ＡＢＣ')).toBe('ABC')
    expect(sanitizeTTSText('１２３')).toBe('123')
    expect(sanitizeTTSText('（）')).toBe('()')
    expect(sanitizeTTSText('＊')).toBe('')
  })

  it('removes asterisks including normalized fullwidth ones', () => {
    expect(sanitizeTTSText('**bold**')).toBe('bold')
    expect(sanitizeTTSText('＊重點＊')).toBe('重點')
  })

  // Regression: fbda87d9 — horizontal rules (---) caused TTS errors
  it('removes horizontal rule lines', () => {
    expect(sanitizeTTSText('---')).toBe('')
    expect(sanitizeTTSText('  -----  ')).toBe('')
    expect(sanitizeTTSText('text\n---\nmore')).toBe('text\n\nmore')
  })

  // Regression: fbda87d9 — dot-only lines like "..." on their own line
  it('removes dot-only lines', () => {
    expect(sanitizeTTSText('...')).toBe('')
    expect(sanitizeTTSText('  ...  ')).toBe('')
  })

  it('does not remove dots inside normal text', () => {
    expect(sanitizeTTSText('end. start')).toBe('end. start')
  })

  // Regression: 3c114fd2 — ellipsis (…) was not replaced, causing mispronunciation
  it('replaces ellipsis-like characters with 。', () => {
    expect(sanitizeTTSText('好⋯')).toBe('好。')
    expect(sanitizeTTSText('好…')).toBe('好。')
    expect(sanitizeTTSText('好︙')).toBe('好。')
    expect(sanitizeTTSText('好……')).toBe('好。')
    expect(sanitizeTTSText('好⋯⋯⋯')).toBe('好。')
  })

  // Regression: 3c114fd2 — em dashes had no pause, causing run-on speech
  // Regression: 343dea3d — dashes now map to ASCII comma (not fullwidth ，)
  it('replaces dash-like characters with comma', () => {
    expect(sanitizeTTSText('好—壞')).toBe('好,壞')
    expect(sanitizeTTSText('好──壞')).toBe('好,壞')
    expect(sanitizeTTSText('好⸺壞')).toBe('好,壞')
  })

  // Regression: fbda87d9 — vertical quotation marks were only replaced once (no /g flag)
  it('normalizes all vertical quotation marks globally', () => {
    expect(sanitizeTTSText('﹁a﹂﹁b﹂')).toBe('「a」「b」')
    expect(sanitizeTTSText('﹃a﹄﹃b﹄')).toBe('『a』『b』')
  })

  it('applies multiple sanitization rules together', () => {
    const input = '﹁好＊﹂\n---\n好⋯⋯好—壞'
    const result = sanitizeTTSText(input)
    expect(result).toBe('「好」\n\n好。好,壞')
  })
})

describe('isSpeakableText', () => {
  // Regression: 99236427 — punctuation-only segments caused Minimax/Azure synthesis errors
  it('returns false for punctuation-only text', () => {
    expect(isSpeakableText('...')).toBe(false)
    expect(isSpeakableText('---')).toBe(false)
    expect(isSpeakableText('***')).toBe(false)
    expect(isSpeakableText('。，、')).toBe(false)
    expect(isSpeakableText('——')).toBe(false)
  })

  it('returns false for empty text', () => {
    expect(isSpeakableText('')).toBe(false)
  })

  it('returns true for text containing letters', () => {
    expect(isSpeakableText('hello')).toBe(true)
    expect(isSpeakableText('你好')).toBe(true)
  })

  it('returns true for text containing digits', () => {
    expect(isSpeakableText('123')).toBe(true)
  })

  it('returns false when text becomes non-speakable after sanitization', () => {
    expect(isSpeakableText('⋯⋯')).toBe(false)
  })

  it('returns true when text has letters after sanitization', () => {
    expect(isSpeakableText('＊hello＊')).toBe(true)
  })
})

describe('splitTextIntoSegments', () => {
  it('returns empty array for empty input', () => {
    expect(splitTextIntoSegments('')).toEqual([])
  })

  it('returns single segment for short text', () => {
    expect(splitTextIntoSegments('你好世界')).toEqual(['你好世界'])
  })

  // Regression: 33c20b20 — sentence boundaries are preferred over commas
  it('splits at sentence-ending punctuation', () => {
    const text = '這是第一句話不算短的文本。這是第二句話也不算短的文本。'
    const result = splitTextIntoSegments(text)
    expect(result.join('')).toBe(text)
  })

  // Regression: eebb08af — closing quotes must stay attached to sentence-ending punctuation
  it('keeps closing quotes attached to sentence punctuation', () => {
    const text = '他說：「我很好。」然後離開了。'
    const result = splitTextIntoSegments(text)
    const joined = result.join('')
    expect(joined).toBe(text)
    for (const seg of result) {
      expect(seg).not.toMatch(/^[」』】》）)'\u2019\u201D]/)
    }
  })

  it('splits long text at clause-level punctuation when sentences are too long', () => {
    const clause = '這是一段包含了很多很多內容的測試文字用來驗證文本能被正確分段的子句'
    const longText = `${clause}，${clause}，${clause}。`
    const result = splitTextIntoSegments(longText)
    expect(result.length).toBeGreaterThan(1)
    for (const segment of result) {
      expect(segment.length).toBeLessThanOrEqual(150)
    }
  })

  // Regression: 99236427 — non-speakable segments must be filtered out
  it('filters out non-speakable segments', () => {
    const text = '你好。---。世界。'
    const result = splitTextIntoSegments(text)
    for (const segment of result) {
      expect(isSpeakableText(segment)).toBe(true)
    }
  })

  // Regression: 415e73d3 — short fragments should be merged
  it('merges short adjacent parts instead of producing many tiny segments', () => {
    const result = splitTextIntoSegments('好。嗎。你。我。他。她。')
    expect(result.length).toBeLessThan(6)
    expect(result.join('')).toBe('好。嗎。你。我。他。她。')
  })

  // Regression: 415e73d3 — short trailing text merges into previous segment
  it('merges short trailing text into the previous segment', () => {
    // "嗎。" is short trailing; should merge with the sentence before it
    const sentence = '這是一段長度接近上限的句子讓結尾能夠被測試到。'
    const result = splitTextIntoSegments(`${sentence}嗎。`)
    const lastSegment = result[result.length - 1]!
    expect(lastSegment).toContain('嗎。')
  })

  it('handles text with only whitespace and zero-width spaces', () => {
    expect(splitTextIntoSegments('   \u200B  ')).toEqual([])
  })

  it('preserves text integrity — no characters lost', () => {
    const text = '第一段。第二段！第三段？最後一段。'
    const result = splitTextIntoSegments(text)
    expect(result.join('')).toBe(text)
  })

  // Regression: balanced splitter must not strand consecutive punctuation in
  // its own segment (which would then be filtered as non-speakable and lost)
  it('preserves consecutive punctuation between long passages', () => {
    const long = 'あ'.repeat(100)
    const text = `${long}。。${long}`
    const result = splitTextIntoSegments(text)
    expect(result.join('')).toBe(text)
  })

  it('produces segments with uniform length variance to smooth TTS playback', () => {
    const clause = 'あ'.repeat(29)
    const text = `${clause}。${clause}。${clause}。${clause}。${clause}。${clause}。${clause}。${clause}。`
    const result = splitTextIntoSegments(text)
    expect(result.join('')).toBe(text)
    const lengths = result.map(seg => seg.length)
    for (const length of lengths) {
      expect(length).toBeLessThanOrEqual(100)
    }
    // Tight spread catches regressions to a greedy fill pattern (e.g.
    // 100/100/40) which a weaker 50%-variance bound would silently accept.
    const maxLen = Math.max(...lengths)
    const minLen = Math.min(...lengths)
    expect(maxLen - minLen).toBeLessThanOrEqual(30)
    expect(minLen).toBeGreaterThanOrEqual(60)
  })
})

describe('mergeShortTTSSegments', () => {
  function makeSegment(text: string, overrides?: Partial<TTSSegment>): TTSSegment {
    return {
      id: 'test',
      text,
      sectionIndex: 0,
      elementIndex: 0,
      cfi: '/test',
      ...overrides,
    }
  }

  it('returns same array for 0 or 1 segments', () => {
    expect(mergeShortTTSSegments([])).toEqual([])
    const single = [makeSegment('hello world test')]
    expect(mergeShortTTSSegments(single)).toHaveLength(1)
  })

  // Regression: 415e73d3 — short fragments trigger extra TTS API calls
  it('merges short adjacent segments in the same section/element/cfi', () => {
    const segments = [
      makeSegment('短文'),
      makeSegment('也是短文'),
    ]
    const result = mergeShortTTSSegments(segments)
    expect(result).toHaveLength(1)
    expect(result[0]!.text).toBe('短文也是短文')
  })

  it('does not merge segments from different sections', () => {
    const segments = [
      makeSegment('短', { sectionIndex: 0 }),
      makeSegment('文', { sectionIndex: 1 }),
    ]
    expect(mergeShortTTSSegments(segments)).toHaveLength(2)
  })

  it('does not merge segments with different cfi', () => {
    const segments = [
      makeSegment('短', { cfi: '/a' }),
      makeSegment('文', { cfi: '/b' }),
    ]
    expect(mergeShortTTSSegments(segments)).toHaveLength(2)
  })

  it('does not merge segments with different elementIndex', () => {
    const segments = [
      makeSegment('短', { elementIndex: 0 }),
      makeSegment('文', { elementIndex: 1 }),
    ]
    expect(mergeShortTTSSegments(segments)).toHaveLength(2)
  })

  it('does not merge when combined length exceeds MAX_SEGMENT_LENGTH (100)', () => {
    const segments = [
      makeSegment('a'.repeat(10)),
      makeSegment('b'.repeat(95)),
    ]
    expect(mergeShortTTSSegments(segments)).toHaveLength(2)
  })

  it('only merges when at least one segment is below MIN_SEGMENT_LENGTH (15)', () => {
    const segments = [
      makeSegment('a'.repeat(20)),
      makeSegment('b'.repeat(20)),
    ]
    expect(mergeShortTTSSegments(segments)).toHaveLength(2)
  })

  it('chains merges across multiple consecutive short segments', () => {
    const segments = [
      makeSegment('一'),
      makeSegment('二'),
      makeSegment('三'),
    ]
    const result = mergeShortTTSSegments(segments)
    expect(result).toHaveLength(1)
    expect(result[0]!.text).toBe('一二三')
  })

  it('mutates the text of the first segment when merging', () => {
    const seg1 = makeSegment('短')
    const segments = [seg1, makeSegment('文')]
    const result = mergeShortTTSSegments(segments)
    expect(result[0]).toBe(seg1)
    expect(seg1.text).toBe('短文')
  })
})

describe('TTS config helpers', () => {
  it('TTS_CONFIG_KEY is tts-config', () => {
    expect(TTS_CONFIG_KEY).toBe('tts-config')
  })

  it('getTTSConfigKeySuffixes returns the suffix list', () => {
    const suffixes = getTTSConfigKeySuffixes()
    expect(suffixes).toContain('voice')
    expect(suffixes).toContain('playback-rate')
  })

  it('getTTSConfigKeyWithSuffix joins key and suffix', () => {
    expect(getTTSConfigKeyWithSuffix('tts-config', 'voice')).toBe('tts-config-voice')
    expect(getTTSConfigKeyWithSuffix('tts-config', 'playback-rate')).toBe('tts-config-playback-rate')
  })
})

describe('computeTTSTextSig', () => {
  const baseParams = {
    token: '',
    voiceId: 'female-qn-qingse',
    language: 'zh',
    nftClassId: '0xAbC123',
    text: '你好世界',
  }

  it('normalizes nftClassId case so mixed-case addresses converge', () => {
    const lower = computeTTSTextSig({ ...baseParams, nftClassId: '0xabc123' })
    const upper = computeTTSTextSig({ ...baseParams, nftClassId: '0xABC123' })
    expect(lower).toBe(upper)
  })

  it('produces the same sig across users for system voices (empty token)', () => {
    const userA = computeTTSTextSig({ ...baseParams, token: '' })
    const userB = computeTTSTextSig({ ...baseParams, token: '' })
    expect(userA).toBe(userB)
  })

  it('diverges per user when a ttsKey token is supplied', () => {
    const alice = computeTTSTextSig({ ...baseParams, token: 'alice-tts-key' })
    const bob = computeTTSTextSig({ ...baseParams, token: 'bob-tts-key' })
    expect(alice).not.toBe(bob)
  })

  // Regression: 7a6bc55a — voice and language must be part of the binding so
  // a client cannot reuse a sig across voices/languages.
  it.each([
    ['voiceId', { voiceId: 'male-qn-qingse' }],
    ['language', { language: 'en' }],
    ['text', { text: '再見' }],
    ['nftClassId', { nftClassId: '0xdeadbeef' }],
  ])('changes when %s changes', (_field, overrides) => {
    expect(computeTTSTextSig({ ...baseParams, ...overrides })).not.toBe(
      computeTTSTextSig(baseParams),
    )
  })
})

describe('computeLegacyTTSTextSig', () => {
  it('normalizes nftClassId case', () => {
    const lower = computeLegacyTTSTextSig('tok', '0xabc', 'hello')
    const upper = computeLegacyTTSTextSig('tok', '0xABC', 'hello')
    expect(lower).toBe(upper)
  })

  // Regression: 6e685d38 — legacy sig shape (no voice/language binding) must
  // stay stable so stale PWA clients keep working during the rollout window.
  it('differs from the new voice/language-bound sig shape', () => {
    const legacy = computeLegacyTTSTextSig('tok', '0xabc', 'hello')
    const current = computeTTSTextSig({
      token: 'tok',
      voiceId: 'female-qn-qingse',
      language: 'zh',
      nftClassId: '0xabc',
      text: 'hello',
    })
    expect(legacy).not.toBe(current)
  })
})
