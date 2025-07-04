interface TTSChunk {
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

const VOICE_MAPPING = [
  'Chinese (Mandarin)_Warm_Bestie',
  'Boyan_new_platform',
]

function processEventData(eventData: string) {
  const dataMatch = eventData.match(/^data:\s*(.+)$/m)
  if (!dataMatch) return null

  const jsonStr = dataMatch[1]?.trim()
  if (!jsonStr) return null

  const parsed: TTSChunk = JSON.parse(jsonStr) // this might throw if the JSON is malformed

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

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session) {
    throw createError({
      status: 401,
      message: 'UNAUTHORIZED',
    })
  }
  if (!session.user?.isLikerPlus) {
    throw createError({
      status: 402,
      message: 'UPGRADE_REQUIRED',
    })
  }
  const config = useRuntimeConfig()
  const {
    minimaxGroupId,
    minimaxAPIKey,
  } = config
  const { text, language: rawLanguage, voice_id: voiceId = '0' } = getQuery(event)
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
  if (!voiceId || !VOICE_MAPPING[Number(voiceId)]) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }
  const language = rawLanguage as keyof typeof LANG_MAPPING
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}"`)

  try {
    const command = {
      text: text,
      stream: true,
      stream_options: {
        exclude_aggregated_audio: false,
      },
      model: 'speech-02-hd',
      voice_setting: {
        voice_id: VOICE_MAPPING[Number(voiceId)],
        speed: 0.95,
        pitch: -1,
        emotion: 'neutral',
      },
      language_boost: LANG_MAPPING[language],
    }

    const response = await $fetch<ReadableStream>(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${minimaxGroupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${minimaxAPIKey}`,
      },
      responseType: 'stream',
      body: command,
    })

    let buffer = ''
    const processStream = new TransformStream({
      start() {
        buffer = ''
      },
      transform(chunk, controller) {
        try {
          buffer += chunk
          let eventEndIndex = buffer.indexOf('\n\n')
          while (eventEndIndex !== -1) {
            const event = buffer.substring(0, eventEndIndex).trim()
            buffer = buffer.substring(eventEndIndex + 2) // '\n\n' is 2 characters long
            if (event) {
              try {
                const audioBuffer = processEventData(event)
                if (audioBuffer) {
                  controller.enqueue(audioBuffer)
                }
              }
              catch (error) {
                console.error(`[Speech] Error processing event for user ${session.user.evmWallet}:`, error)
                controller.error((error as Error).message || 'TTS_PROCESSING_ERROR')
                return
              }
            }
            eventEndIndex = buffer.indexOf('\n\n')
          }
        }
        catch (error) {
          console.error(`[Speech] Error processing chunk for user ${session.user.evmWallet}:`, error)
          controller.error('TTS_PROCESSING_ERROR: Failed to process text-to-speech data')
          return
        }
      },
      flush(controller) {
        if (!buffer.trim()) {
          return
        }
        try {
          const audioBuffer = processEventData(buffer)
          if (audioBuffer) {
            controller.enqueue(audioBuffer)
          }
        }
        catch (error) {
          console.warn(`[Speech] Error in flush for user ${session.user.evmWallet}:`, error)
        }
      },
    })

    const decodedStream = response.pipeThrough(new TextDecoderStream())
    decodedStream.pipeThrough(processStream)
    setHeader(event, 'content-type', 'audio/mpeg')
    setHeader(event, 'cache-control', 'public, max-age=604800')
    return sendStream(event, processStream.readable)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
