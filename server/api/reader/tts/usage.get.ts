import { TTS_TRIAL_CHARACTER_LIMIT } from '~~/shared/utils/tts-trial'

export default defineEventHandler(async (event): Promise<{ charactersUsed: number, limit: number }> => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  const limit = TTS_TRIAL_CHARACTER_LIMIT

  if (session.user.isLikerPlus) {
    return { charactersUsed: 0, limit }
  }

  const userDoc = await getUserDoc(wallet)
  return { charactersUsed: Number(userDoc?.ttsCharactersUsed || 0), limit }
})
