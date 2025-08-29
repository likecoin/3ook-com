import type { Writable } from 'node:stream'
import { AzureTTSProvider } from '~/server/utils/tts-azure'

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

  const validVoiceId = voiceId as string
  if (!voiceId) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }
  const provider = getTTSProvider(validVoiceId)
  const language = rawLanguage as keyof typeof LANG_MAPPING
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}", Voice: ${validVoiceId}, Provider: ${VOICE_PROVIDER_MAPPING[validVoiceId]}`)

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
        const metadata = await file.getMetadata()
        setHeader(event, 'content-type', metadata[0].contentType || provider.format)
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
    // Make the request to the TTS provider
    const response = await provider.processRequest({
      text,
      language,
      voiceId: validVoiceId,
      session,
      config,
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
      })
    }

    const audioChunks: Buffer[] = []

    function handleCacheWrite() {
      if (isCacheEnabled && cacheWriteStream) {
        if (audioChunks.length > 0) {
          const combinedBuffer = Buffer.concat(audioChunks)
          cacheWriteStream.end(combinedBuffer)
        }
        else {
          cacheWriteStream.destroy()
        }
      }
    }

    // Use provider-specific stream processing
    const processStream = provider.createProcessStream({
      isCacheEnabled,
      audioChunks,
      handleCacheWrite,
    })
    const processResponse = response.pipeThrough(processStream)
    setHeader(event, 'content-type', provider.format)
    setHeader(event, 'cache-control', 'public, max-age=604800')
    return sendStream(event, processResponse)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
