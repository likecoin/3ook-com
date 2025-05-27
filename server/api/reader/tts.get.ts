import type {
  LanguageCode,
  VoiceId,
} from '@aws-sdk/client-polly'
import {
  PollyClient,
  SynthesizeSpeechCommand,
} from '@aws-sdk/client-polly'

let client: PollyClient | null = null

const LANG_MAPPING = {
  'en-US': 'en-US',
  'zh-TW': 'cmn-CN',
  'zh-HK': 'yue-CN',
}

const VOICE_MAPPING = {
  'en-US': 'Ruth',
  'zh-TW': 'Zhiyu',
  'zh-HK': 'Hiujin',
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
    awsAccessKeyId,
    awsAccessKeySecret,
    awsRegion = 'us-west-2',
  } = config
  const { text, language: rawLanguage } = getQuery(event)
  if (!text || typeof text !== 'string') {
    throw createError({
      status: 400,
      message: 'MISSING_TEXT',
    })
  }
  if (!rawLanguage || typeof rawLanguage !== 'string' || !(rawLanguage in LANG_MAPPING)) {
    throw createError({
      status: 400,
      message: 'INVALID_LANGUAGE',
    })
  }
  const language = rawLanguage as keyof typeof LANG_MAPPING
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}"`)

  if (!client) {
    client = new PollyClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsAccessKeySecret,
      },
    })
  }

  try {
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'ogg_vorbis',
      VoiceId: VOICE_MAPPING[language] as VoiceId,
      LanguageCode: LANG_MAPPING[language] as LanguageCode,
      Engine: 'neural',
      TextType: 'text',
    })
    const response = await client.send(command)
    if (!response.AudioStream) {
      throw createError({
        status: 500,
        message: 'SPEECH_SYNTHESIS_FAILED',
      })
    }
    const stream = response.AudioStream.transformToWebStream()
    setHeader(event, 'content-type', 'audio/ogg; codecs=opus')
    setHeader(event, 'cache-control', 'public, max-age=3600')
    return sendStream(event, stream)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
