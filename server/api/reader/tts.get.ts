import type { Writable } from 'node:stream'

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

const VOICE_MAPPING: Record<string, string> = {
  0: 'Chinese (Mandarin)_Warm_Bestie',
  1: 'Boyan_new_platform',
  pazu: 'book_pazu_v1',
  phoebe: 'phoebe_v1',
}

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
  const validVoiceId = voiceId as keyof typeof VOICE_MAPPING as string
  if (!voiceId || !VOICE_MAPPING[validVoiceId]) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }
  const language = rawLanguage as keyof typeof LANG_MAPPING
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}"`)

  if (!await getUserTTSAvailable(event)) {
    throw createError({
      status: 402,
      message: 'REQUIRE_LIKER_PLUS',
    })
  }

  await updateUserTTSCharacterUsage(session.user.evmWallet, text.length)

  const bucket = getTTSCacheBucket()
  const isCacheEnabled = !!bucket
  if (isCacheEnabled) {
    const cacheKey = generateTTSCacheKey(language, validVoiceId, text)
    const file = bucket.file(cacheKey)

    try {
      const [exists] = await file.exists()
      if (exists) {
        setHeader(event, 'content-type', 'audio/mpeg')
        setHeader(event, 'cache-control', 'public, max-age=604800')
        console.log(`[Speech] Cache hit for user ${session.user.evmWallet}: ${cacheKey}`)
        return sendStream(event, file.createReadStream())
      }
    }
    catch (error) {
      console.warn(`[Speech] Cache check failed for user ${session.user.evmWallet}:`, error)
    }
  }

  try {
    const command = {
      text: text,
      stream: true,
      stream_options: {
        exclude_aggregated_audio: false,
      },
      model: 'speech-02-hd',
      voice_setting: {
        voice_id: VOICE_MAPPING[validVoiceId],
        speed: 0.95,
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

    let cacheWriteStream: Writable | null = null
    let cacheKey: string | null = null

    if (isCacheEnabled) {
      cacheKey = generateTTSCacheKey(language, validVoiceId, text)
      const cacheFile = bucket.file(cacheKey)
      // Firebase Storage metadata has a 2KB limit per key
      const truncatedText = text.length > 1800 ? text.substring(0, 1800) + '...' : text
      cacheWriteStream = cacheFile.createWriteStream({
        metadata: {
          contentType: 'audio/mpeg',
          customMetadata: {
            language,
            voiceId: validVoiceId,
            text: truncatedText,
            textLength: text.length.toString(),
            createdAt: new Date().toISOString(),
          },
        },
      })
    }

    let buffer = ''
    let hasError = false
    const audioChunks: Buffer[] = []

    function handleCacheWrite() {
      if (isCacheEnabled && cacheWriteStream) {
        if (!hasError && audioChunks.length > 0) {
          const combinedBuffer = Buffer.concat(audioChunks)
          cacheWriteStream.end(combinedBuffer)
        }
        else {
          cacheWriteStream.destroy()
        }
      }
    }

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
                  if (isCacheEnabled) {
                    audioChunks.push(audioBuffer)
                  }
                  controller.enqueue(audioBuffer)
                }
              }
              catch (error) {
                hasError = true
                console.error(`[Speech] Error processing event for user ${session.user.evmWallet}:`, error)
                controller.error((error as Error).message || 'TTS_PROCESSING_ERROR')
                return
              }
            }
            eventEndIndex = buffer.indexOf('\n\n')
          }
        }
        catch (error) {
          hasError = true
          console.error(`[Speech] Error processing chunk for user ${session.user.evmWallet}:`, error)
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
          hasError = true
          console.warn(`[Speech] Error in flush for user ${session.user.evmWallet}:`, error)
          if (isCacheEnabled && cacheWriteStream) {
            cacheWriteStream.destroy()
          }
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
