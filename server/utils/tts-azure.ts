import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import type { BaseTTSProvider, TTSRequestParams } from './api-tts'
import { TTSProvider } from './api-tts'

const LANG_MAPPING = {
  'en-US': 'en-US',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-HK',
}

const VOICE_MAPPING: Record<string, string> = {
  xiaochen: 'zh-CN-XiaochenMultilingualNeural',
}

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function speakTextAsync(synthesizer: sdk.SpeechSynthesizer, text: string, voiceName: string, language: string) {
  return new Promise((resolve, reject) => {
    const escapedText = escapeSSML(text)
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${voiceName}">
          <lang xml:lang="${language}">${escapedText}</lang>
        </voice>
      </speak>`
    synthesizer.speakSsmlAsync(ssml,
      function (result) {
        synthesizer.close()
        resolve(result)
      },
      function (err) {
        synthesizer.close()
        reject(err)
      })
  })
}
export class AzureTTSProvider implements BaseTTSProvider {
  provider = TTSProvider.AZURE
  format = 'audio/mpeg'

  async processRequest(params: TTSRequestParams): Promise<ReadableStream> {
    const { text, language, voiceId, config } = params
    const { azureSubscriptionKey, azureServiceRegion } = config

    if (!azureSubscriptionKey || !azureServiceRegion) {
      throw createError({
        status: 403,
        message: 'NOT_AVAILABLE',
      })
    }

    const voiceName = VOICE_MAPPING[voiceId]
    if (!voiceName) {
      throw createError({
        status: 400,
        message: 'INVALID_VOICE_ID',
      })
    }

    if (!LANG_MAPPING[language as keyof typeof LANG_MAPPING]) {
      throw createError({
        status: 400,
        message: 'INVALID_LANGUAGE',
      })
    }

    const outputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3

    const pullStream = sdk.PullAudioOutputStream.create()
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream)
    const speechConfig = sdk.SpeechConfig.fromSubscription(azureSubscriptionKey, azureServiceRegion)
    speechConfig.speechSynthesisVoiceName = voiceName
    speechConfig.speechSynthesisOutputFormat = outputFormat

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
    synthesizer.SynthesisCanceled = (_, e) => {
      console.error('[Speech] Synthesis canceled:', e)
      throw createError({
        status: 500,
        message: e.result.errorDetails,
      })
    }
    await speakTextAsync(synthesizer, text, voiceName, language)

    const readableStream = new ReadableStream({
      type: 'bytes',
      autoAllocateChunkSize: 1024,
      async pull(controller) {
        try {
          const byobRequest = controller.byobRequest
          if (byobRequest?.view) {
            const buffer = byobRequest.view.buffer as ArrayBuffer
            const bytesRead = await pullStream.read(buffer)

            if (bytesRead > 0) {
              byobRequest.respond(bytesRead)
            }
            else {
              pullStream.close()
              controller.close()
            }
          }
          else {
            // Fallback: allocate our own buffer
            const buffer = new ArrayBuffer(1024)
            const bytesRead = await pullStream.read(buffer)

            if (bytesRead > 0) {
              const chunk = new Uint8Array(buffer, 0, bytesRead)
              controller.enqueue(chunk)
            }
            else {
              pullStream.close()
              controller.close()
            }
          }
        }
        catch (error) {
          console.error('[Speech] Error reading from pull stream:', error)
          controller.error(error)
          pullStream.close()
        }
      },
      cancel() {
        pullStream.close()
      },
    })

    return readableStream
  }

  createProcessStream(cacheWriteOptions: { isCacheEnabled: boolean, audioChunks: Buffer[], handleCacheWrite: () => void }): ReadableWritablePair {
    const { isCacheEnabled, audioChunks, handleCacheWrite } = cacheWriteOptions

    return new TransformStream({
      transform(chunk, controller) {
        try {
          const audioBuffer = Buffer.from(chunk)
          if (audioBuffer) {
            if (isCacheEnabled) {
              audioChunks.push(audioBuffer)
            }
            controller.enqueue(audioBuffer)
          }
        }
        catch (error) {
          console.error('[Speech] Error processing Azure chunk:', error)
          controller.error('TTS_PROCESSING_ERROR: Failed to process Azure TTS data')
          return
        }
      },
      flush() {
        handleCacheWrite()
      },
    })
  }
}
