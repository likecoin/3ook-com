import type { CustomVoiceData } from '~~/shared/types/custom-voice'

export default defineEventHandler(async (event): Promise<CustomVoiceData | null> => {
  const wallet = await requireUserWallet(event)

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
