export interface MinimaxTTSChunk {
  data: {
    audio: string
    status: number // 1: streaming chunk, 2: final summary chunk
  }
  trace_id: string
  base_resp: {
    status_code: number
    status_msg: string
  }
  extra_info?: {
    audio_length: number
    audio_sample_rate: number
    audio_size: number
    audio_bitrate: number
    word_count: number
    invisible_character_ratio: number
    audio_format: string
    usage_characters: number
  }
}

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
    const { text, language, voiceId, config } = params
    const { minimaxGroupId, minimaxAPIKey } = config

    if (!minimaxGroupId || !minimaxAPIKey) {
      throw createError({
        status: 403,
        message: 'NOT_AVAILABLE',
      })
    }

    if (!VOICE_MAPPING[voiceId]) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    const command = {
      text: text,
      stream: true,
      stream_options: {
        exclude_aggregated_audio: true,
      },
      model: 'speech-2.6-hd',
      voice_setting: {
        voice_id: VOICE_MAPPING[voiceId],
        speed: 0.95,
        emotion: 'neutral',
        text_normalization: true,
      },
      pronunciation_dict: getTTSPronunciationDictionary(language),
      language_boost: LANG_MAPPING[language as keyof typeof LANG_MAPPING],
    }

    return await $fetch<ReadableStream>(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${minimaxGroupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${minimaxAPIKey}`,
      },
      responseType: 'stream',
      body: command,
    })
  }

  processEventData(eventData: string): Buffer | null {
    const dataMatch = eventData.match(/^data:\s*(.+)$/m)
    if (!dataMatch) return null

    const jsonStr = dataMatch[1]?.trim()
    if (!jsonStr) return null

    const parsed: MinimaxTTSChunk = JSON.parse(jsonStr) // this might throw if the JSON is malformed

    if (parsed.base_resp?.status_code !== 0) {
      throw createError({
        name: 'TTS_API_ERROR',
        message: parsed.base_resp?.status_msg || 'Unknown API error',
      })
    }

    if (parsed.data.status === 1 && parsed.data.audio) {
      return Buffer.from(parsed.data.audio, 'hex')
    }

    return null
  }

  createProcessStream(cacheWriteOptions: { isCacheEnabled: boolean, audioChunks: Buffer[], handleCacheWrite: () => void }): ReadableWritablePair {
    const { isCacheEnabled, audioChunks, handleCacheWrite } = cacheWriteOptions
    let buffer = ''
    const processEventData = this.processEventData.bind(this)
    const decodeStream = new TextDecoderStream()
    const transformStream = new TransformStream({
      start() {
        buffer = ''
      },
      transform(chunk, controller) {
        try {
          buffer += chunk
          let eventEndIndex = buffer.indexOf('\n\n')
          while (eventEndIndex !== -1) {
            const event = buffer.substring(0, eventEndIndex).trim()
            buffer = buffer.substring(eventEndIndex + 2) // '\n\n' is 2 characters long - Minimax SSE specific
            if (event) {
              try {
                const audioBuffer = processEventData(event)
                if (audioBuffer) {
                  if (isCacheEnabled) {
                    audioChunks.push(audioBuffer)
                  }
                  controller.enqueue(audioBuffer)
                }
              }
              catch (error) {
                console.error('[Speech] Error processing Minimax event:', error)
                controller.error((error as Error).message || 'TTS_PROCESSING_ERROR')
                return
              }
            }
            eventEndIndex = buffer.indexOf('\n\n')
          }
        }
        catch (error) {
          console.error('[Speech] Error processing Minimax chunk:', error)
          controller.error('TTS_PROCESSING_ERROR: Failed to process text-to-speech data')
          return
        }
      },
      flush(controller) {
        if (!buffer.trim()) {
          handleCacheWrite()
          return
        }
        try {
          const audioBuffer = processEventData(buffer)
          if (audioBuffer) {
            if (isCacheEnabled) {
              audioChunks.push(audioBuffer)
            }
            controller.enqueue(audioBuffer)
          }
          handleCacheWrite()
        }
        catch (error) {
          console.warn('[Speech] Error in Minimax flush:', error)
          handleCacheWrite()
        }
      },
    })
    return {
      readable: decodeStream.readable.pipeThrough(transformStream),
      writable: decodeStream.writable,
    }
  }
}
