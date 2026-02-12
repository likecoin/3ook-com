import { MiniMaxSpeech } from 'minimax-speech-ts'

let cachedClient: MiniMaxSpeech | null = null

export function getMiniMaxSpeechClient(): MiniMaxSpeech {
  if (cachedClient) return cachedClient
  const config = useRuntimeConfig()
  if (!config.minimaxAPIKey || !config.minimaxGroupId) {
    throw createError({ status: 403, message: 'NOT_AVAILABLE' })
  }
  cachedClient = new MiniMaxSpeech({
    apiKey: config.minimaxAPIKey,
    groupId: config.minimaxGroupId,
  })
  return cachedClient
}
