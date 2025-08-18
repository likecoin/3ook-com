import type { H3Event } from 'h3'

export async function getUserTTSAvailable(event: H3Event): Promise<boolean> {
  const session = await getUserSession(event)
  if (!session || !session.user) return false
  const isLikerPlus = session.user.isLikerPlus || false
  if (isLikerPlus) return true
  const userDoc = await getUserDoc(session.user.evmWallet)
  if (!userDoc || !userDoc.ttsCharactersUsed || userDoc.ttsCharactersUsed as number < 300) return true
  return false
}

export function getTTSPronunciationDictionary(language: string) {
  switch (language) {
    case 'zh-TW':
      return {
        tone: [
          '乾/(gan1)',
        ],
      }
    case 'zh-HK':
      return {
        tone: [
          '掬/(谷)',
          '驥/(冀)',
          '頰/(甲)',
        ],
      }
    case 'en-US':
      return undefined
    default:
      return undefined
  }
}
