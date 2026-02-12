import { createHash } from 'crypto'
import { getStorage as getFirebaseStorage } from 'firebase-admin/storage'

function getDefaultBucket() {
  const app = getFirebaseApp()
  const storage = getFirebaseStorage(app)
  return storage.bucket()
}

export function generateTTSCacheKey(language: string, voiceId: string, text: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  // Create a hash of the text to avoid filesystem issues with special characters
  const textHash = createHash('sha256').update(text).digest('hex')
  return `${config.ttsCacheBucketPrefix}/${language}/${voiceId}/${textHash}.mp3`
}

export function getTTSCacheBucket() {
  const config = useRuntimeConfig()
  const bucketName = config.ttsCacheBucketPrefix
  if (!bucketName) {
    return null
  }
  return getDefaultBucket()
}

export function generateCustomVoiceTTSCacheKey(wallet: string, language: string, text: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  const textHash = createHash('sha256').update(text).digest('hex')
  return `${config.ttsCacheBucketPrefix}/custom-voices/${wallet}/${language}/${textHash}.mp3`
}

export function getCustomVoiceTTSCachePrefix(wallet: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  return `${config.ttsCacheBucketPrefix}/custom-voices/${wallet}/`
}

export function getCustomVoiceAudioPath(wallet: string, ext: string): string {
  return `custom-voices/${wallet}/source-audio.${ext}`
}

export function getCustomVoiceAvatarPath(wallet: string, ext: string): string {
  return `custom-voices/${wallet}/avatar.${ext}`
}

export function getCustomVoiceStorageBucket() {
  const config = useRuntimeConfig()
  if (!config.customVoiceBucketEnabled) {
    return null
  }
  return getDefaultBucket()
}
