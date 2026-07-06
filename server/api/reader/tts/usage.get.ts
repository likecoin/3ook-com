import { TTS_TRIAL_CHARACTER_LIMIT } from '~~/shared/utils/tts-trial'

export default defineEventHandler(async (event): Promise<{ charactersUsed: number, limit: number }> => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  const limit = TTS_TRIAL_CHARACTER_LIMIT

  if (isLikerPlus) {
    return { charactersUsed: 0, limit }
  }

  const userDoc = await getUserDoc(wallet)
  return { charactersUsed: Number(userDoc?.ttsCharactersUsed || 0), limit }
})
