import { MiniMaxSpeech } from 'minimax-speech-ts'

let cachedClient: MiniMaxSpeech | null = null

export function getMiniMaxSpeechClient(): MiniMaxSpeech {
  if (cachedClient) return cachedClient
  const config = useRuntimeConfig()
  cachedClient = new MiniMaxSpeech({
    apiKey: config.minimaxAPIKey,
    groupId: config.minimaxGroupId,
  })
  return cachedClient
}
