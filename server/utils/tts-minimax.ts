import type { BaseTTSProvider, TTSRequestParams } from './api-tts'

export const LANG_MAPPING = {
  'en-US': 'English',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese,Yue',
}

interface VoiceConfig {
  minimaxVoiceId: string
  displayName: string
  model?: string
}

const VOICE_CONFIG: Record<string, VoiceConfig> = {
  0: { minimaxVoiceId: 'Chinese (Mandarin)_Warm_Bestie', displayName: 'Female Narrator' },
  1: { minimaxVoiceId: 'Chinese (Mandarin)_Southern_Young_Man', displayName: 'Male Narrator' },
  astro: { minimaxVoiceId: 'three_book_astro_v1', displayName: 'Astro' },
  aurora: { minimaxVoiceId: 'three_book_aurora_v1', displayName: 'Aurora' },
  pazu: { minimaxVoiceId: 'three_book_pazu_v3', displayName: 'Pazu' },
  phoebe: { minimaxVoiceId: 'three_book_phoebe_v2', model: 'speech-2.6-hd', displayName: 'Phoebe' },
}

export const KNOWN_VOICE_IDS = new Set(Object.keys(VOICE_CONFIG))

export function getVoiceDisplayName(voiceId: string): string | undefined {
  return VOICE_CONFIG[voiceId]?.displayName
}

interface PronunciationRule {
  // Source text that must be fully present for the rule to apply.
  target: string
  // The override for `target`: Mandarin Pinyin (tone 1–5), IPA, or Cantonese
  // Jyutping (tone 1–6), wrapped in half-width parentheses. For multi-char
  // targets it spans the whole word with only the relevant syllables overridden
  // (e.g. target `茅塞頓開` → tone `茅(sak1)頓開`). Used as-is for the inline
  // form, and as `${target}/${tone}` for the Minimax `pronunciationDict`.
  tone: string
}

// Pronunciation overrides keyed by Minimax synthesis language.
const TTS_PRONUNCIATION_RULES: Record<string, PronunciationRule[]> = {
  'zh-TW': [
    { target: '乾', tone: '(gan1)' },
  ],
  'zh-HK': [
    { target: '茅塞頓開', tone: '茅(sak1)頓開' },
    { target: '區家麟', tone: '(au1)家麟' },
    { target: '悄悄', tone: '(ciu1)(ciu1)' },
    { target: '肖像', tone: '(ciu3)像' },
    { target: '顫抖', tone: '(zin3)抖' },
    { target: '掬', tone: '(guk1)' },
    { target: '驥', tone: '(kei3)' },
    { target: '頰', tone: '(gaap3)' },
  ],
}

// Rules that actually apply to this request: language must match and the
// target text must be fully present (Minimax mis-handles dict entries whose
// match never occurs, and a leaner dict keeps the payload small).
function getApplicablePronunciationRules(language: string, text: string): PronunciationRule[] {
  const rules = TTS_PRONUNCIATION_RULES[language]
  if (!rules) return []
  return rules.filter(rule => text.includes(rule.target))
}

// `undefined` (not an empty dict) when nothing applies, so Minimax skips the
// pronunciationDict entirely.
export function getTTSPronunciationDictionary(
  language: string,
  text: string,
): { tone: string[] } | undefined {
  const tone = getApplicablePronunciationRules(language, text)
    .map(rule => `${rule.target}/${rule.tone}`)
  return tone.length ? { tone } : undefined
}

// Alternative to `pronunciationDict`: splice the override straight into the
// text via Minimax's half-width-parenthesis inline syntax, e.g.
// "去街市買啲(sung3)。" / "This is (he2)平, not (huo4)面."
export function applyInlinePronunciation(language: string, text: string): string {
  return getApplicablePronunciationRules(language, text).reduce(
    (acc, rule) => acc.split(rule.target).join(rule.tone),
    text,
  )
}

export function getMinimaxModel(options: {
  voiceId?: string
  customVoiceId?: string
  language?: string
} = {}): string {
  const { voiceId, customVoiceId, language } = options
  const voiceModel = voiceId && VOICE_CONFIG[voiceId]?.model
  if (voiceModel) {
    return voiceModel
  }
  if (language === 'zh-HK') {
    return 'speech-2.8-hd'
  }
  return customVoiceId && language !== 'zh-TW' ? 'speech-2.8-hd' : 'speech-2.6-hd'
}

// Minimax inline-pause syntax: <#seconds#>. 0.01s is imperceptible.
const TTS_PAUSE_MARKER = '<#0.01#>'

// Minimax speech-2.x degrades the rest of a synthesis call into garbled,
// unintelligible noise when it hits an unpronounceable glyph; a pause marker
// bounds that corruption to the clause between markers. Minimax also rejects
// consecutive and trailing markers, so
// we collapse punctuation runs and require a speakable char after. The
// lookahead stays intentionally narrow: skipping a quote-opened clause only
// weakens protection, but a looser test could emit a marker before a trailing
// 」 with no speakable text after — the exact invalid input this avoids.
// Segments arrive pre-split/speakable, so the run always has speakable text
// before it.
function injectTTSPauseMarkers(text: string): string {
  return text.replace(/([，。]+)(?=\s*[\p{L}\p{N}])/gu, `$1${TTS_PAUSE_MARKER}`)
}

export class MinimaxTTSProvider implements BaseTTSProvider {
  provider = 'minimax'
  format = 'audio/mpeg'

  async processRequest(params: TTSRequestParams): Promise<Buffer> {
    const { text, language, voiceId, customMiniMaxVoiceId } = params

    if (!customMiniMaxVoiceId && !VOICE_CONFIG[voiceId]) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    const client = getMiniMaxSpeechClient()
    const resolvedVoiceId = (customMiniMaxVoiceId || VOICE_CONFIG[voiceId]!.minimaxVoiceId) as string
    const model = getMinimaxModel({ voiceId, customVoiceId: customMiniMaxVoiceId, language })

    const result = await client.synthesize({
      text: injectTTSPauseMarkers(text),
      model,
      voiceSetting: {
        voiceId: resolvedVoiceId,
        speed: 1,
        emotion: 'calm',
        textNormalization: true,
      },
      pronunciationDict: getTTSPronunciationDictionary(language, text),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
    })

    return result.audio
  }

  async processRequestStream(params: TTSRequestParams): Promise<ReadableStream<Buffer>> {
    const { text, language, voiceId, customMiniMaxVoiceId } = params

    if (!customMiniMaxVoiceId && !VOICE_CONFIG[voiceId]) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    const client = getMiniMaxSpeechClient()
    const resolvedVoiceId = (customMiniMaxVoiceId || VOICE_CONFIG[voiceId]!.minimaxVoiceId) as string
    const model = getMinimaxModel({ voiceId, customVoiceId: customMiniMaxVoiceId, language })

    const { audio } = await client.synthesizeStream({
      text: injectTTSPauseMarkers(text),
      model,
      voiceSetting: {
        voiceId: resolvedVoiceId,
        speed: 1,
        emotion: 'calm',
        textNormalization: true,
      },
      pronunciationDict: getTTSPronunciationDictionary(language, text),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
      streamOptions: { excludeAggregatedAudio: true },
    })
    return audio
  }
}
