import type { CustomVoiceData } from '~/shared/types/custom-voice'

export default defineEventHandler(async (event): Promise<CustomVoiceData | null> => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const customVoice = await getCustomVoice(wallet)
  if (!customVoice) return null

  return {
    voiceId: customVoice.voiceId,
    voiceName: customVoice.voiceName,
    voiceLanguage: customVoice.voiceLanguage,
    avatarUrl: customVoice.avatarUrl,
    createdAt: customVoice.createdAt?.toMillis?.() ?? undefined,
    updatedAt: customVoice.updatedAt?.toMillis?.() ?? undefined,
  }
})
