import type { BaseTTSProvider, TTSProviderResult, TTSProviderStreamResult, TTSRequestParams } from './api-tts'
import zhHKPronunciation from './tts-pronunciation/zh-HK.json'
import zhTWPronunciation from './tts-pronunciation/zh-TW.json'

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

// Pronunciation overrides keyed by Minimax synthesis language. Each maps a
// source word (`target`) to its `override`: Mandarin Pinyin (tone 1–5)
// or Cantonese Jyutping (tone 1–6) wrapped in half-width parentheses, spanning
// the whole word with only the relevant syllables overridden (e.g. `排行` →
// `排(hang2)`, `茅塞頓開` → `茅(sak1)頓開`). The override is used as-is for the
// inline form, and as `${target}/${override}` for the Minimax `pronunciationDict`.
// zh-TW is generated from the MOE dictionary by scripts/tts-pronunciation/
// generate.mjs; that generator and its source CSVs are kept local (gitignored),
// so only this committed JSON ships — regenerate from your local copy.
const TTS_PRONUNCIATION_RULES: Record<string, Record<string, string>> = {
  'zh-TW': zhTWPronunciation,
  'zh-HK': zhHKPronunciation,
}

// Precomputed once at module load: each language's [target, override] pairs,
// sorted longest target first so the most specific override wins for
// polyphones — `排行榜` before `排行`, and the inline form rewrites the longer
// word before its prefix. The hot path only filters these, so the ~6k-entry
// zh-TW array is never rebuilt or re-sorted per TTS segment request.
const TTS_PRONUNCIATION_ENTRIES: Record<string, [target: string, override: string][]>
  = Object.fromEntries(Object.entries(TTS_PRONUNCIATION_RULES)
    .map(([language, rules]) => [
      language,
      Object.entries(rules).sort(([a], [b]) => b.length - a.length),
    ]))

// Rules that actually apply to this request: language must match and the target
// word must be fully present (Minimax mis-handles dict entries whose match
// never occurs, and a leaner dict keeps the payload small).
function getApplicablePronunciationRules(language: string, text: string): [target: string, override: string][] {
  const entries = TTS_PRONUNCIATION_ENTRIES[language]
  if (!entries) return []
  return entries.filter(([target]) => text.includes(target))
}

// Pass the exact text sent to Minimax (i.e. after `injectTTSPauseMarkers`): a
// pause marker spliced into a clause-spanning target — many zh-TW idiom entries
// contain ，— stops that target from appearing verbatim, and Minimax mis-handles
// dict entries whose match never occurs. Returns `undefined` (not an empty dict)
// when nothing applies, so Minimax skips the pronunciationDict entirely.
export function getTTSPronunciationDictionary(
  language: string,
  synthesizedText: string,
): { tone: string[] } | undefined {
  const tone = getApplicablePronunciationRules(language, synthesizedText)
    .map(([target, override]) => `${target}/${override}`)
  return tone.length ? { tone } : undefined
}

// Alternative to `pronunciationDict`: splice the override straight into the
// text via Minimax's half-width-parenthesis inline syntax, e.g.
// "去街市買啲(sung3)。" / "This is (he2)平, not (huo4)面."
export function applyInlinePronunciation(language: string, text: string): string {
  return getApplicablePronunciationRules(language, text).reduce(
    (acc, [target, override]) => acc.split(target).join(override),
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

// Minimax speech-2.x degrades the rest of a synthesis call into garbled noise
// when it hits an unpronounceable glyph; a pause marker bounds that corruption
// to the clause between markers. Minimax rejects consecutive and trailing
// markers, so we collapse punctuation runs and require a speakable char after
// (segments arrive pre-split/speakable, so there is a speakable char before
// the run too). The narrow lookahead avoids emitting a marker before a
// trailing 」 with no speakable text after — the exact invalid input Minimax
// rejects. The class is the fullwidth/CJK clause set only: 。、 are CJK and
// never normalized, and sanitizeTTSText keeps ，；： fullwidth (see its
// comment for why). ASCII ,;: are excluded so Latin tokens like "12:30" or
// "e.g.," don't get spurious markers.
const TTS_PAUSE_BOUNDARY_RE = /([，。、；：]+)(?=\s*[\p{L}\p{N}])/gu

export function injectTTSPauseMarkers(text: string): string {
  return text.replace(TTS_PAUSE_BOUNDARY_RE, `$1${TTS_PAUSE_MARKER}`)
}

export class MinimaxTTSProvider implements BaseTTSProvider {
  provider = 'minimax'
  format = 'audio/mpeg'

  async processRequest(params: TTSRequestParams): Promise<TTSProviderResult> {
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
    const synthesizedText = injectTTSPauseMarkers(text)

    const result = await client.synthesize({
      text: synthesizedText,
      model,
      voiceSetting: {
        voiceId: resolvedVoiceId,
        speed: 1,
        emotion: 'calm',
        textNormalization: true,
      },
      pronunciationDict: getTTSPronunciationDictionary(language, synthesizedText),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
    })

    return { audio: result.audio, extraInfo: result.extraInfo, traceId: result.traceId }
  }

  async processRequestStream(params: TTSRequestParams): Promise<TTSProviderStreamResult> {
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
    const synthesizedText = injectTTSPauseMarkers(text)

    const { audio, extraInfo, traceId } = await client.synthesizeStream({
      text: synthesizedText,
      model,
      voiceSetting: {
        voiceId: resolvedVoiceId,
        speed: 1,
        emotion: 'calm',
        textNormalization: true,
      },
      pronunciationDict: getTTSPronunciationDictionary(language, synthesizedText),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
      streamOptions: { excludeAggregatedAudio: true },
    })
    return { audio, extraInfo, traceId }
  }
}
