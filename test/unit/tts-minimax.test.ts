// @vitest-environment node
// These are pure string helpers needing no DOM; the default `nuxt` (unenv)
// environment stubs out node:crypto, which tts-minimax.ts touches at import
// time (TTS_PRONUNCIATION_VERSION), so import fails there. Run under real Node.
import { describe, expect, it } from 'vitest'
import { applyInlinePronunciation, getTTSModel, getProviderVoiceId, getTTSPronunciationDictionary, injectTTSPauseMarkers, isElevenLabsVoiceId, isKnownVoiceId, resolveVoiceId } from '~~/server/utils/tts-minimax'
import { parseTTSVoiceVersion } from '~~/shared/utils/tts-voice-version'

const MARKER = '<#0.01#>'

describe('injectTTSPauseMarkers', () => {
  it('inserts a pause marker after fullwidth/CJK clause punctuation', () => {
    expect(injectTTSPauseMarkers('好，壞')).toBe(`好，${MARKER}壞`)
    expect(injectTTSPauseMarkers('好。壞')).toBe(`好。${MARKER}壞`)
    expect(injectTTSPauseMarkers('甲、乙')).toBe(`甲、${MARKER}乙`)
    expect(injectTTSPauseMarkers('好；壞')).toBe(`好；${MARKER}壞`)
    expect(injectTTSPauseMarkers('好：壞')).toBe(`好：${MARKER}壞`)
  })

  it('does not insert markers for ASCII , ; : (Latin tokens stay intact)', () => {
    expect(injectTTSPauseMarkers('12:30')).toBe('12:30')
    expect(injectTTSPauseMarkers('e.g., word')).toBe('e.g., word')
    expect(injectTTSPauseMarkers('a, b; c')).toBe('a, b; c')
  })

  it('collapses punctuation runs into a single marker', () => {
    expect(injectTTSPauseMarkers('好。。壞')).toBe(`好。。${MARKER}壞`)
    expect(injectTTSPauseMarkers('好，。壞')).toBe(`好，。${MARKER}壞`)
  })

  it('does not emit a marker when no speakable char follows', () => {
    expect(injectTTSPauseMarkers('好。')).toBe('好。')
    expect(injectTTSPauseMarkers('好，」')).toBe('好，」')
  })

  it('skips intervening whitespace when checking for a speakable char', () => {
    expect(injectTTSPauseMarkers('好。 壞')).toBe(`好。${MARKER} 壞`)
  })
})

describe('getTTSPronunciationDictionary', () => {
  it('disambiguates a polyphone by word context', () => {
    // 乾 is 乾(gan1) in 餅乾 but 乾(qian2) in 乾隆 — the word, not the char, decides.
    expect(getTTSPronunciationDictionary('zh-TW', '清朝乾隆年間')?.tone).toContain('乾隆/(qian2)隆')
    expect(getTTSPronunciationDictionary('zh-TW', '一包餅乾')?.tone).toContain('餅乾/餅(gan1)')
  })

  it('emits the longest matching word first', () => {
    const tone = getTTSPronunciationDictionary('zh-TW', '他在排行榜上')!.tone
    const longerIndex = tone.indexOf('排行榜/排(hang2)榜')
    const shorterIndex = tone.indexOf('排行/排(hang2)')
    expect(longerIndex).toBeGreaterThanOrEqual(0)
    expect(shorterIndex).toBeGreaterThanOrEqual(0)
    expect(longerIndex).toBeLessThan(shorterIndex)
  })

  it('returns undefined when nothing applies, so Minimax skips the dict', () => {
    expect(getTTSPronunciationDictionary('zh-TW', '今天天氣很好')).toBeUndefined()
    expect(getTTSPronunciationDictionary('en-US', 'hello world')).toBeUndefined()
  })

  it('drops a clause-spanning entry once a pause marker splits the target', () => {
    // The marker injected after ， means the full-idiom target no longer appears
    // verbatim in what Minimax synthesizes, so it must not be sent as a dict entry.
    const idiom = '一人得道，雞犬升天'
    const entry = '一人得道，雞犬升天/一人(de2)道，雞犬升天'
    expect(getTTSPronunciationDictionary('zh-TW', idiom)?.tone).toContain(entry)
    expect(getTTSPronunciationDictionary('zh-TW', injectTTSPauseMarkers(idiom))?.tone ?? [])
      .not.toContain(entry)
  })

  it('still serves the hand-curated zh-HK dictionary', () => {
    expect(getTTSPronunciationDictionary('zh-HK', '茅塞頓開')?.tone).toContain('茅塞頓開/茅(sak1)頓開')
  })
})

describe('parseTTSVoiceVersion', () => {
  it('splits only a literal _v<digits> suffix off the base', () => {
    expect(parseTTSVoiceVersion('phoebe_v28')).toEqual({ base: 'phoebe', version: 28 })
    expect(parseTTSVoiceVersion('phoebe')).toEqual({ base: 'phoebe', version: 0 })
  })

  it('keeps underscored team_member ids as whole bases', () => {
    // corrupt_alex and corrupt_hung are different voices in the same team —
    // a shared prefix must never make them the same base.
    expect(parseTTSVoiceVersion('corrupt_alex')).toEqual({ base: 'corrupt_alex', version: 0 })
    expect(parseTTSVoiceVersion('corrupt_hung_v2')).toEqual({ base: 'corrupt_hung', version: 2 })
  })
})

describe('resolveVoiceId', () => {
  it('returns an exactly configured id as-is', () => {
    expect(resolveVoiceId('phoebe_v26')).toBe('phoebe_v26')
    expect(resolveVoiceId('0')).toBe('0')
  })

  it('falls back from a missing version to the latest of the same base', () => {
    expect(resolveVoiceId('phoebe')).toBe('phoebe_v28')
    expect(resolveVoiceId('phoebe_v27')).toBe('phoebe_v28')
  })

  it('never falls back across different bases', () => {
    expect(resolveVoiceId('phoebe26')).toBeUndefined()
    expect(isKnownVoiceId('unknown_voice')).toBe(false)
  })

  it('rejects Object.prototype keys as voice ids', () => {
    expect(resolveVoiceId('constructor')).toBeUndefined()
    expect(isKnownVoiceId('toString')).toBe(false)
  })

  it('resolves config lookups through the fallback', () => {
    expect(getProviderVoiceId('phoebe')).toBe('three_book_phoebe_v3')
    expect(getTTSModel({ voiceId: 'phoebe', language: 'zh-HK' })).toBe('speech-2.8-hd')
    expect(getTTSModel({ voiceId: 'phoebe_v26', language: 'zh-HK' })).toBe('speech-2.6-hd')
  })
})

describe('ElevenLabs voices', () => {
  it('resolves as exact, unversioned ids pinned to eleven_v4', () => {
    for (const voiceId of ['el_chunwai', 'el_sukyee', 'el_kevintu', 'el_liang']) {
      expect(resolveVoiceId(voiceId)).toBe(voiceId)
      expect(isElevenLabsVoiceId(voiceId)).toBe(true)
      expect(getTTSModel({ voiceId, language: 'zh-HK' })).toBe('eleven_v4')
    }
    expect(getProviderVoiceId('el_chunwai')).toBe('2HZgeWhEm3MJfPZ0MsrV')
  })

  it('leaves Minimax voices on the Minimax provider', () => {
    expect(isElevenLabsVoiceId('phoebe_v28')).toBe(false)
    expect(isElevenLabsVoiceId('unknown_voice')).toBe(false)
  })
})

describe('applyInlinePronunciation', () => {
  it('splices the longest override in and leaves its prefix untouched', () => {
    expect(applyInlinePronunciation('zh-TW', '排行榜')).toBe('排(hang2)榜')
  })

  it('returns the text unchanged when nothing applies', () => {
    expect(applyInlinePronunciation('zh-TW', '今天天氣很好')).toBe('今天天氣很好')
  })
})
