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
        setHeader(event, 'content-type', metadata[0].contentType || provider.format)
        setHeader(event, 'cache-control', isCustomVoice ? 'private, max-age=604800' : 'public, max-age=604800')
        if (Number(metadata[0].size)) {
          setHeader(event, 'content-length', Number(metadata[0].size))
        }
        console.log(`[Speech] Cache hit for user ${session.user.evmWallet}: ${cacheKey}`)
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

    setHeader(event, 'content-type', provider.format)
    setHeader(event, 'cache-control', isCustomVoice ? 'private, max-age=604800' : 'public, max-age=604800')
    setHeader(event, 'content-length', buffer.length)

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

    return buffer
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
