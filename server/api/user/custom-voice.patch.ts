const ALLOWED_LANGUAGES = ['zh-HK', 'zh-TW']

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const isLikerPlus = session.user.isLikerPlus || false
  if (!isLikerPlus) {
    throw createError({ statusCode: 403, message: 'REQUIRE_LIKER_PLUS' })
  }

  const customVoice = await getCustomVoice(wallet)
  if (!customVoice) {
    throw createError({ statusCode: 404, message: 'NO_CUSTOM_VOICE' })
  }

  const body = await readBody<{ voiceLanguage?: string }>(event)
  if (!body.voiceLanguage || !ALLOWED_LANGUAGES.includes(body.voiceLanguage)) {
    throw createError({ statusCode: 400, message: 'INVALID_VOICE_LANGUAGE' })
  }

  await updateCustomVoiceLanguage(wallet, body.voiceLanguage)

  return { voiceLanguage: body.voiceLanguage }
})
