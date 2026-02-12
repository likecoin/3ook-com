import type { CustomVoiceData } from '~/shared/types/custom-voice'

export default defineEventHandler(async (event): Promise<CustomVoiceData | null> => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const customVoice = await getCustomVoice(wallet)
  if (!customVoice) return null

  let avatarUrl: string | undefined
  if (customVoice.avatarPath) {
    const bucket = getCustomVoiceStorageBucket()
    if (bucket) {
      const file = bucket.file(customVoice.avatarPath)
      const [exists] = await file.exists()
      if (exists) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        avatarUrl = url
      }
    }
  }

  return {
    voiceId: customVoice.voiceId,
    voiceName: customVoice.voiceName,
    voiceLanguage: customVoice.voiceLanguage,
    avatarUrl,
    createdAt: customVoice.createdAt?.toMillis?.() ?? undefined,
    updatedAt: customVoice.updatedAt?.toMillis?.() ?? undefined,
  }
})
