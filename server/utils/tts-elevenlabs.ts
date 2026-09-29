import type { BaseTTSProvider, TTSExtraInfo, TTSProviderResult, TTSProviderStreamResult, TTSRequestParams } from './api-tts'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech'
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128'

// v4 accepts `yue` for Cantonese although the API documents ISO 639-1 codes.
const ELEVENLABS_LANGUAGE_CODE: Record<string, string> = {
  'en-US': 'en',
  'zh-TW': 'zh',
  'zh-HK': 'yue',
}

function getElevenLabsAPIKey(): string {
  const config = useRuntimeConfig()
  if (!config.elevenlabsAPIKey) {
    throw createError({ status: 403, message: 'NOT_AVAILABLE' })
  }
  return String(config.elevenlabsAPIKey)
}

// Generation metadata rides response headers, so it settles with the response
// rather than at the end of the stream as Minimax's SSE aggregate does.
function getElevenLabsResponseInfo(response: Response): { extraInfo: TTSExtraInfo, traceId?: string } {
  const characterCost = Number(response.headers.get('character-cost'))
  return {
    extraInfo: { usageCharacters: Number.isFinite(characterCost) ? characterCost : undefined },
    traceId: response.headers.get('request-id') ?? undefined,
  }
}

export class ElevenLabsTTSProvider implements BaseTTSProvider {
  provider = 'elevenlabs'
  format = 'audio/mpeg'

  private async fetchSpeech(params: TTSRequestParams, isStreaming: boolean): Promise<Response> {
    const { text, language, voiceId } = params
    const providerVoiceId = getProviderVoiceId(voiceId)
    if (!providerVoiceId) {
      throw createError({ status: 400, message: 'INVALID_VOICE_ID' })
    }
    const url = `${ELEVENLABS_API_BASE}/${encodeURIComponent(providerVoiceId)}${isStreaming ? '/stream' : ''}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': getElevenLabsAPIKey(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        // Same resolver as the cache key, so cached audio always matches its model.
        model_id: getTTSModel({ voiceId, language }),
        language_code: ELEVENLABS_LANGUAGE_CODE[language],
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[Speech] ElevenLabs request failed (${response.status}): ${detail.slice(0, 500)}`)
      throw createError({ status: 502, message: 'TTS_PROVIDER_ERROR' })
    }
    return response
  }

  async processRequest(params: TTSRequestParams): Promise<TTSProviderResult> {
    const response = await this.fetchSpeech(params, false)
    const { extraInfo, traceId } = getElevenLabsResponseInfo(response)
    return { audio: Buffer.from(await response.arrayBuffer()), extraInfo, traceId }
  }

  async processRequestStream(params: TTSRequestParams): Promise<TTSProviderStreamResult> {
    const response = await this.fetchSpeech(params, true)
    if (!response.body) {
      throw createError({ status: 502, message: 'TTS_PROVIDER_ERROR' })
    }
    const { extraInfo, traceId } = getElevenLabsResponseInfo(response)
    const audio = response.body.pipeThrough(new TransformStream<Uint8Array, Buffer>({
      transform(chunk, controller) {
        controller.enqueue(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength))
      },
    }))
    return { audio, extraInfo: Promise.resolve(extraInfo), traceId: Promise.resolve(traceId) }
  }
}
