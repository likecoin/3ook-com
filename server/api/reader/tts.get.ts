import { createHash } from 'node:crypto'
import { AzureTTSProvider } from '~/server/utils/tts-azure'

function parseRangeHeader(rangeHeader: string, totalSize: number): { start: number, end: number } | null {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null

  let start = match[1] ? Number.parseInt(match[1], 10) : NaN
  let end = match[2] ? Number.parseInt(match[2], 10) : NaN

  if (Number.isNaN(start) && Number.isNaN(end)) return null

  // Suffix range: bytes=-500 means last 500 bytes
  if (Number.isNaN(start)) {
    start = Math.max(0, totalSize - end)
    end = totalSize - 1
  }
  else if (Number.isNaN(end)) {
    end = totalSize - 1
  }

  if (start > end || start >= totalSize) return null
  end = Math.min(end, totalSize - 1)

  return { start, end }
}

const LANG_MAPPING = {
  'en-US': 'English',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese,Yue',
}

// Voice mapping with provider information
const VOICE_PROVIDER_MAPPING: Record<string, TTSProvider> = {
  // Minimax voices
  0: TTSProvider.MINIMAX,
  1: TTSProvider.MINIMAX,
  aurora: TTSProvider.MINIMAX,
  pazu: TTSProvider.MINIMAX,
  phoebe: TTSProvider.MINIMAX,
  xiaochen: TTSProvider.AZURE,
}

// Provider factory
function getTTSProvider(voiceId: string): BaseTTSProvider {
  const voiceProvider = VOICE_PROVIDER_MAPPING[voiceId]
  if (!voiceProvider) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }

  switch (voiceProvider) {
    case TTSProvider.MINIMAX:
      return new MinimaxTTSProvider()
    case TTSProvider.AZURE:
      return new AzureTTSProvider()
    default:
      throw createError({
        status: 500,
        message: 'UNSUPPORTED_TTS_PROVIDER',
      })
  }
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
  const { text, language: rawLanguage, voice_id: voiceId } = getQuery(event)

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

  const validVoiceId = voiceId as string
  if (!voiceId) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }

  const isCustomVoice = validVoiceId === 'custom'
  let customMiniMaxVoiceId: string | undefined
  let provider: BaseTTSProvider

  if (isCustomVoice) {
    const isLikerPlus = session.user.isLikerPlus || false
    if (!isLikerPlus) {
      throw createError({ status: 402, message: 'REQUIRE_LIKER_PLUS' })
    }
    const customVoice = await getCustomVoice(session.user.evmWallet)
    if (!customVoice?.voiceId) {
      throw createError({ status: 404, message: 'NO_CUSTOM_VOICE' })
    }
    customMiniMaxVoiceId = customVoice.voiceId
    provider = new MinimaxTTSProvider()
  }
  else {
    provider = getTTSProvider(validVoiceId)
  }

  const language = rawLanguage as keyof typeof LANG_MAPPING
  const customVoiceWallet = isCustomVoice ? session.user.evmWallet : undefined
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}", Voice: ${validVoiceId}${isCustomVoice ? ` (${customMiniMaxVoiceId})` : ''}, Provider: ${isCustomVoice ? 'minimax' : VOICE_PROVIDER_MAPPING[validVoiceId]}`)

  if (!await getUserTTSAvailable(event)) {
    throw createError({
      status: 402,
      message: 'REQUIRE_LIKER_PLUS',
    })
  }

  await updateUserTTSCharacterUsage(session.user.evmWallet, text.length)

  const ttsModel = isCustomVoice
    ? getMinimaxModel(customMiniMaxVoiceId, language)
    : (VOICE_PROVIDER_MAPPING[validVoiceId] === TTSProvider.MINIMAX ? getMinimaxModel() : 'azure')
  const bucket = getTTSCacheBucket()
  const isCacheEnabled = !!bucket
  const cacheKey = isCacheEnabled
    ? (customVoiceWallet
        ? generateCustomVoiceTTSCacheKey(customVoiceWallet, language, text, ttsModel)
        : generateTTSCacheKey(language, validVoiceId, text, ttsModel))
    : null

  if (isCacheEnabled) {
    const file = bucket.file(cacheKey!)

    try {
      const [exists] = await file.exists()
      if (exists) {
        const metadata = await file.getMetadata()
        const totalSize = Number(metadata[0].size)
        const contentType = metadata[0].contentType || provider.format
        const rangeHeader = getHeader(event, 'range')

        const etag = `"${createHash('sha256').update(cacheKey!).digest('hex').substring(0, 16)}"`
        setHeader(event, 'content-type', contentType)
        setHeader(event, 'cache-control', isCustomVoice ? 'private, max-age=604800' : 'public, max-age=604800')
        setHeader(event, 'accept-ranges', 'bytes')
        setHeader(event, 'vary', 'Range')
        setHeader(event, 'etag', etag)

        console.log(`[Speech] Cache hit for user ${session.user.evmWallet}: ${cacheKey}`)

        if (rangeHeader && totalSize) {
          const range = parseRangeHeader(rangeHeader, totalSize)
          if (range) {
            const { start, end } = range
            setResponseStatus(event, 206)
            setHeader(event, 'content-range', `bytes ${start}-${end}/${totalSize}`)
            setHeader(event, 'content-length', end - start + 1)
            return sendStream(event, file.createReadStream({ start, end }))
          }
        }

        if (totalSize) {
          setHeader(event, 'content-length', totalSize)
        }
        return sendStream(event, file.createReadStream())
      }
    }
    catch (error) {
      console.warn(`[Speech] Cache check failed for user ${session.user.evmWallet}:`, error)
    }
  }

  try {
    const buffer = await provider.processRequest({
      text,
      language,
      voiceId: validVoiceId,
      customMiniMaxVoiceId,
      session,
      config,
    })

    const etag = cacheKey
      ? `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
      : `"${createHash('sha256').update(buffer).digest('hex').substring(0, 16)}"`
    setHeader(event, 'content-type', provider.format)
    setHeader(event, 'cache-control', isCustomVoice ? 'private, max-age=604800' : 'public, max-age=604800')
    setHeader(event, 'accept-ranges', 'bytes')
    setHeader(event, 'vary', 'Range')
    setHeader(event, 'etag', etag)

    if (isCacheEnabled) {
      const cacheFile = bucket.file(cacheKey!)
      const truncatedText = text.length > 1800 ? text.substring(0, 1800) + '...' : text
      cacheFile.save(buffer, {
        metadata: {
          contentType: provider.format,
          customMetadata: {
            language,
            voiceId: validVoiceId,
            provider: provider.provider,
            text: truncatedText,
            textLength: text.length.toString(),
            createdAt: new Date().toISOString(),
          },
        },
      }).catch((error: unknown) => {
        console.warn(`[Speech] Cache write failed for user ${session.user.evmWallet}:`, error)
      })
    }

    const rangeHeader = getHeader(event, 'range')
    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, buffer.length)
      if (range) {
        const { start, end } = range
        setResponseStatus(event, 206)
        setHeader(event, 'content-range', `bytes ${start}-${end}/${buffer.length}`)
        setHeader(event, 'content-length', end - start + 1)
        return buffer.subarray(start, end + 1)
      }
    }

    setHeader(event, 'content-length', buffer.length)

    return buffer
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
