import { PassThrough } from 'stream'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function speakTextAsync(synthesizer: sdk.SpeechSynthesizer, text: string, voiceName: string, language: string, rate: string = '1.0') {
  return new Promise((resolve, reject) => {
    const escapedText = escapeSSML(text)
    const ssml = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="${language}">
      <voice name='${voiceName}'>
        <prosody rate="${rate}">
          <lang xml:lang='${language}'>
            ${escapedText}
          </lang>
        </prosody>
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

const LANG_TO_NAME: Record<string, Record<string, string>> = {
  'en-US': {
    female1: 'zh-CN-XiaochenMultilingualNeural',
    female2: 'zh-CN-XiaoxiaoMultilingualNeural',
    male1: 'zh-CN-YunyiMultilingualNeural',
    male2: 'zh-CN-YunfanMultilingualNeural',
  },
  'zh-TW': {
    female1: 'zh-CN-XiaochenMultilingualNeural',
    female2: 'zh-CN-XiaoxiaoMultilingualNeural',
    male1: 'zh-CN-YunyiMultilingualNeural',
    male2: 'zh-CN-YunfanMultilingualNeural',
  },
  'zh-HK': {
    female1: 'zh-CN-XiaochenMultilingualNeural',
    female2: 'zh-CN-XiaoxiaoMultilingualNeural',
    male1: 'zh-CN-YunyiMultilingualNeural',
    male2: 'zh-CN-YunfanMultilingualNeural',
  },
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session) {
    throw createError({
      status: 401,
      message: 'UNAUTHORIZED',
    })
  }
  const config = useRuntimeConfig()
  const {
    azureSubscriptionKey: subscriptionKey = '',
    azureServiceRegion: serviceRegion = 'westus2',
  } = config
  const { text, language, voice = 'female1', rate = '1.0' } = getQuery(event)
  if (!text || typeof text !== 'string') {
    throw createError({
      status: 400,
      message: 'MISSING_TEXT',
    })
  }
  if (!language || typeof language !== 'string' || !voice || typeof voice !== 'string' || !LANG_TO_NAME?.[language]?.[voice]) {
    throw createError({
      status: 400,
      message: 'INVALID_LANGUAGE',
    })
  }
  if (!rate || typeof rate !== 'string' || isNaN(parseFloat(rate))) {
    throw createError({
      status: 400,
      message: 'INVALID_RATE',
    })
  }
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}"`)

  const bufferStream = new PassThrough()
  const stream = sdk.PushAudioOutputStream.create({
    write: a => bufferStream.write(Buffer.from(a)),
    close: () => bufferStream.end(),
  })
  const audioConfig = sdk.AudioConfig.fromStreamOutput(stream)
  const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)

  speechConfig.speechSynthesisVoiceName = LANG_TO_NAME[language][voice]
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
  synthesizer.SynthesisCanceled = function (_, e) {
    const cancellationDetails = sdk.CancellationDetails.fromResult(e.result)
    let str = `[Speech] Error for user ${session.user.evmWallet}: ` + sdk.CancellationReason[cancellationDetails.reason]
    if (cancellationDetails.reason === sdk.CancellationReason.Error) {
      str += ': ' + e.result.errorDetails
    }
    console.error(str)
  }

  try {
    await speakTextAsync(synthesizer, text, LANG_TO_NAME[language][voice], language, rate)
    setHeader(event, 'content-type', 'audio/ogg; codecs=opus')
    setHeader(event, 'cache-control', 'public, max-age=3600')
    return sendStream(event, bufferStream)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
