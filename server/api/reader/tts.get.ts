import { Readable } from 'stream'

const LANG_MAPPING = {
  'en-US': 'English',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese,Yue',
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
    minimaxGroupId,
    minimaxAPIKey,
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

  try {
    const command = {
      text: text,
      model: 'speech-02-hd',
      voice_setting: {
        voice_id: 'Chinese (Mandarin)_Warm_Bestie',
        speed: 0.95,
        pitch: -1,
        emotion: 'neutral',
      },
      language_boost: LANG_MAPPING[language],
    }

    interface MinimaxT2AResponse {
      data: {
        audio: string
      }
    }

    const response = await $fetch<MinimaxT2AResponse>(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${minimaxGroupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${minimaxAPIKey}`,
      },
      body: command,
    })

    const audioHex = response.data.audio
    if (!audioHex || typeof audioHex !== 'string') {
      console.error(`[Speech] Invalid audio response for user ${session.user.evmWallet}:`, response)
      throw createError({
        status: 500,
        message: 'INVALID_AUDIO_RESPONSE',
      })
    }
    const audioBuffer = Buffer.from(audioHex, 'hex')
    const stream = Readable.from(audioBuffer)
    setHeader(event, 'content-type', 'audio/mpeg')
    setHeader(event, 'cache-control', 'public, max-age=14400')
    return sendStream(event, stream)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
