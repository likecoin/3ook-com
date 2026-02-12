import type { BaseTTSProvider, TTSRequestParams } from './api-tts'
import { TTSProvider } from './api-tts'

const LANG_MAPPING = {
  'en-US': 'English',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese,Yue',
}

// Voice mapping with provider information
const VOICE_MAPPING: Record<string, string> = {
  // Minimax voices
  0: 'Chinese (Mandarin)_Warm_Bestie',
  1: 'Chinese (Mandarin)_Southern_Young_Man',
  pazu: 'book_pazu_v2',
  phoebe: 'phoebe_v1',
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

export class MinimaxTTSProvider implements BaseTTSProvider {
  provider = TTSProvider.MINIMAX
  format = 'audio/mpeg'

  async processRequest(params: TTSRequestParams): Promise<ReadableStream> {
    const { text, language, voiceId, customMiniMaxVoiceId } = params

    if (!customMiniMaxVoiceId && !VOICE_MAPPING[voiceId]) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    const client = getMiniMaxSpeechClient()
    const resolvedVoiceId = (customMiniMaxVoiceId || VOICE_MAPPING[voiceId]) as string
    const model = customMiniMaxVoiceId ? 'speech-2.8-hd' : 'speech-2.6-hd'

    return await client.synthesizeStream({
      text,
      model,
      voiceSetting: {
        voiceId: resolvedVoiceId,
        speed: 1,
        emotion: 'neutral',
        textNormalization: true,
      },
      pronunciationDict: getTTSPronunciationDictionary(language),
      languageBoost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
      streamOptions: { excludeAggregatedAudio: true },
    })
  }

  createProcessStream(cacheWriteOptions: { isCacheEnabled: boolean, audioChunks: Buffer[], handleCacheWrite: () => void }): ReadableWritablePair {
    const { isCacheEnabled, audioChunks, handleCacheWrite } = cacheWriteOptions

    return new TransformStream({
      transform(chunk, controller) {
        if (isCacheEnabled) {
          audioChunks.push(chunk)
        }
        controller.enqueue(chunk)
      },
      flush() {
        handleCacheWrite()
      },
    })
  }
}
