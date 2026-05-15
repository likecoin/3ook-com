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

export function getTTSPronunciationDictionary(language: string) {
  switch (language) {
    case 'zh-TW':
      return {
        tone: [
          '乾/(gan1)',
        ],
      }
    case 'zh-HK':
      return {
        tone: [
          '掬/(谷)',
          '驥/(冀)',
          '頰/(甲)',
        ],
      }
    case 'en-US':
      return undefined
    default:
      return undefined
  }
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
      pronunciationDict: getTTSPronunciationDictionary(language),
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
      pronunciationDict: getTTSPronunciationDictionary(language),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
      streamOptions: { excludeAggregatedAudio: true },
    })
    return audio
  }
}
