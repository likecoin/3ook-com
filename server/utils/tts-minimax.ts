import { createHash } from 'node:crypto'
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
  karenly: { minimaxVoiceId: 'three_book_karenly_v0', displayName: 'Karenly' },
  pazu: { minimaxVoiceId: 'three_book_pazu_v3', displayName: 'Pazu' },
  phoebe: { minimaxVoiceId: 'three_book_phoebe_v3', displayName: 'Phoebe' },
  // Debug clone of Phoebe pinned to the older model so QA can compare it against
  // the default Phoebe. Exposed only in the testnet voice list (client-gated).
  phoebe26: { minimaxVoiceId: 'three_book_phoebe_v3', model: 'speech-2.6-hd', displayName: 'Phoebe 2.6' },
}

export const KNOWN_VOICE_IDS = new Set(Object.keys(VOICE_CONFIG))

export function getVoiceDisplayName(voiceId: string): string | undefined {
  return VOICE_CONFIG[voiceId]?.displayName
}

export function getMinimaxVoiceId(voiceId: string): string | undefined {
  return VOICE_CONFIG[voiceId]?.minimaxVoiceId
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

// Per-language content hash of the pronunciation rules, computed once at module
// load. Editing either JSON changes its hash automatically — no manual bump — so
// cached TTS audio can detect it was generated under a now-outdated dictionary.
// Per-language so a zh-HK edit leaves every zh-TW cache entry untouched.
export const TTS_PRONUNCIATION_VERSION: Record<string, string> = Object.fromEntries(
  Object.entries(TTS_PRONUNCIATION_RULES).map(([language, rules]) =>
    [language, createHash('sha256').update(JSON.stringify(rules)).digest('hex').slice(0, 12)]),
)

// Signature for text no pronunciation rule applies to. Shared so the cache's
// legacy-entry default (server/api/reader/tts.get.ts) stays in lockstep with
// what getTTSPronunciationSignature emits — if they drift, dict-free legacy
// audio would wrongly regenerate.
export const NO_PRONUNCIATION_SIG = 'none'

// Hash of only the pronunciation rules that apply to this exact text — the
// change detector behind cache invalidation. Derives from the same dictionary
// the generator sends to Minimax, so pass the post-`injectTTSPauseMarkers` text
// (a marker spliced into a clause-spanning idiom changes which rules match).
export function getTTSPronunciationSignature(language: string, synthesizedText: string): string {
  const dict = getTTSPronunciationDictionary(language, synthesizedText)
  if (!dict) return NO_PRONUNCIATION_SIG
  return createHash('sha256').update(dict.tone.join('\n')).digest('hex').slice(0, 16)
}

// Memoizing getter for a request's pronunciation signature: computes the
// (~6k-entry for zh-TW) dictionary scan at most once, and only when actually
// called — so a steady-state cache hit whose version stamp matches never pays
// for it. Shared by the reader and sample TTS endpoints.
export function createTTSPronunciationSigGetter(language: string, text: string): () => string {
  let sig: string | undefined
  return () => (sig ??= getTTSPronunciationSignature(language, injectTTSPauseMarkers(text)))
}

// Mirrors Google Cloud Storage's custom-metadata value type (`getMetadata()[0]
// .metadata`), whose values are coerced to these primitives.
type CloudStorageMetadata = Record<string, string | number | boolean | null>

// Cache keys whose stamp refresh is already in flight this process, so the
// concurrent range probes a single playback fans out (see `inFlightWrites` in
// the TTS endpoints) collapse to one metadata PATCH instead of a write burst.
const refreshingPronunciationStamps = new Set<string>()

// Decides whether cached TTS audio is stale after a pronunciation-dict edit,
// shared by the reader and sample endpoints. A version-stamp match is the fast
// path — the audio is current, so the (~6k-entry) signature scan never runs.
// On a version miss the segment is stale only if its applicable rules differ
// from what it was generated with; legacy entries (no stamp) are treated as
// having had no overrides ('none'), so dict-free text is left alone while text
// that now needs a replacement is regenerated. When the rules are unchanged we
// refresh the stamp (fire-and-forget, de-duped per process) so future hits take
// the version fast-path instead of rescanning every time.
export function isCachedTTSPronunciationStale(options: {
  file: { setMetadata: (metadata: { metadata: CloudStorageMetadata }) => Promise<unknown> }
  meta: CloudStorageMetadata
  dictVersion: string
  getExpectedSig: () => string
  cacheKey: string
  label: string
}): boolean {
  const { file, meta, dictVersion, getExpectedSig, cacheKey, label } = options
  if (meta.pronunciationVersion === dictVersion) return false
  const expectedSig = getExpectedSig()
  if (expectedSig !== (meta.pronunciationSig ?? NO_PRONUNCIATION_SIG)) {
    console.log(`[Speech] Stale pronunciation for ${label}, regenerating: ${cacheKey}`)
    return true
  }
  if (!refreshingPronunciationStamps.has(cacheKey)) {
    refreshingPronunciationStamps.add(cacheKey)
    file.setMetadata({ metadata: { ...meta, pronunciationVersion: dictVersion, pronunciationSig: expectedSig } })
      .catch((error: unknown) => console.warn(`[Speech] Failed to refresh pronunciation metadata for ${label}: ${cacheKey}`, error))
      .finally(() => { refreshingPronunciationStamps.delete(cacheKey) })
  }
  return false
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
