const LANG_MAPPING = {
  'zh-HK': true,
}

const VOICE_MAPPING = {
  cozy_f: 'spk_0',
  cozy_m: 'spk_1',
  cozy_pazu: 'spk_2',
}

export class CozyTTSProvider implements BaseTTSProvider {
  provider = TTSProvider.COZY
  format = 'audio/mpeg'

  async processRequest(params: TTSRequestParams): Promise<ReadableStream> {
    const { text, language, voiceId, config } = params
    const { cozyAuthToken } = config
    type VoiceKey = keyof typeof VOICE_MAPPING

    if (!cozyAuthToken) {
      throw createError({
        status: 403,
        message: 'NOT_AVAILABLE',
      })
    }

    if (!LANG_MAPPING[language as keyof typeof LANG_MAPPING]) {
      throw createError({
        status: 400,
        message: 'INVALID_LANGUAGE',
      })
    }
    const speakId = VOICE_MAPPING[voiceId as VoiceKey]
    if (!speakId) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    const command = {
      tts_text: text,
      spk_id: speakId,
      seed: 1337,
    }

    return await $fetch<ReadableStream>('https://voice-api.argmax.tech/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cozyAuthToken}`,
      },
      responseType: 'stream',
      body: command,
    })
  }

  createProcessStream(cacheWriteOptions: { isCacheEnabled: boolean, audioChunks: Buffer[], handleCacheWrite: () => void }): ReadableWritablePair {
    const { isCacheEnabled, audioChunks, handleCacheWrite } = cacheWriteOptions

    return new TransformStream({
      transform(chunk, controller) {
        try {
          // Cozy returns binary audio data directly, no event parsing needed
          const audioBuffer = Buffer.from(chunk)
          if (audioBuffer) {
            if (isCacheEnabled) {
              audioChunks.push(audioBuffer)
            }
            controller.enqueue(audioBuffer)
          }
        }
        catch (error) {
          console.error('[Speech] Error processing Cozy chunk:', error)
          controller.error('TTS_PROCESSING_ERROR: Failed to process Cozy TTS data')
          return
        }
      },
      flush() {
        handleCacheWrite()
      },
    })
  }
}
