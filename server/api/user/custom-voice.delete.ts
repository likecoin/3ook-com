export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)
  if (!isLikerPlus) {
    throw createError({ statusCode: 403, message: 'REQUIRE_LIKER_PLUS' })
  }

  const customVoice = await getCustomVoice(wallet)
  if (!customVoice) {
    throw createError({ statusCode: 404, message: 'NO_CUSTOM_VOICE' })
  }

  const client = getMiniMaxSpeechClient()
  const bucket = getCustomVoiceStorageBucket()
  const ttsBucket = getTTSCacheBucket()

  await Promise.all([
    client.deleteVoice({
      voiceType: 'voice_cloning',
      voiceId: customVoice.voiceId,
    }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete Minimax voice:', error)
    }),
    bucket
      ? bucket.deleteFiles({ prefix: getCustomVoiceAudioPrefix(wallet) }).catch((error) => {
          console.warn('[CustomVoice] Failed to delete audio files:', error)
        })
      : Promise.resolve(),
    bucket
      ? bucket.deleteFiles({ prefix: getCustomVoiceAvatarPrefix(wallet) }).catch((error) => {
          console.warn('[CustomVoice] Failed to delete avatar files:', error)
        })
      : Promise.resolve(),
    bucket
      ? bucket.deleteFiles({ prefix: getCustomVoicePromptAudioPrefix(wallet) }).catch((error) => {
          console.warn('[CustomVoice] Failed to delete prompt audio files:', error)
        })
      : Promise.resolve(),
    ttsBucket
      ? ttsBucket.deleteFiles({ prefix: getTTSCachePrefixForVoice(customVoice.voiceId) }).catch((error) => {
          console.warn('[CustomVoice] Failed to delete TTS cache files:', error)
        })
      : Promise.resolve(),
  ])

  await deleteCustomVoice(wallet)

  publishEvent(event, 'CustomVoiceDelete', {
    evmWallet: wallet,
    voiceId: customVoice.voiceId,
  })

  return { success: true }
})
