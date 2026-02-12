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

  try {
    const client = getMiniMaxSpeechClient()
    await client.deleteVoice({
      voiceType: 'voice_cloning',
      voiceId: customVoice.voiceId,
    })
  }
  catch (error) {
    console.warn('[CustomVoice] Failed to delete Minimax voice:', error)
  }

  const bucket = getCustomVoiceStorageBucket()
  if (bucket) {
    try {
      if (customVoice.audioPath) {
        await bucket.file(customVoice.audioPath).delete().catch(() => {})
      }
      if (customVoice.avatarPath) {
        await bucket.file(customVoice.avatarPath).delete().catch(() => {})
      }
    }
    catch (error) {
      console.warn('[CustomVoice] Failed to delete storage files:', error)
    }
  }

  const ttsBucket = getTTSCacheBucket()
  if (ttsBucket) {
    try {
      const prefix = getCustomVoiceTTSCachePrefix(wallet)
      await ttsBucket.deleteFiles({ prefix })
    }
    catch (error) {
      console.warn('[CustomVoice] Failed to delete TTS cache files:', error)
    }
  }

  await deleteCustomVoice(wallet)

  return { success: true }
})
