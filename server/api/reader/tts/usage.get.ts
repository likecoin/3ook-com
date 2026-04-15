import type { TTSTrialUsageData } from '~/shared/types/tts'
import { TTS_TRIAL_CHARACTER_LIMIT } from '~/server/utils/api-tts'

export default defineEventHandler(async (event): Promise<TTSTrialUsageData> => {
  const wallet = await requireUserWallet(event)
  const session = await requireUserSession(event)

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  const limit = TTS_TRIAL_CHARACTER_LIMIT

  if (session.user.isLikerPlus) {
    return {
      isLikerPlus: true,
      charactersUsed: 0,
      limit,
      charactersRemaining: null,
      isExhausted: false,
    }
  }

  const userDoc = await getUserDoc(wallet)
  const charactersUsed = Number(userDoc?.ttsCharactersUsed || 0)
  const charactersRemaining = Math.max(limit - charactersUsed, 0)

  return {
    isLikerPlus: false,
    charactersUsed,
    limit,
    charactersRemaining,
    isExhausted: charactersRemaining <= 0,
  }
})
