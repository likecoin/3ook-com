import { createHash } from 'crypto'
import { getStorage as getFirebaseStorage } from 'firebase-admin/storage'

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

  const app = getFirebaseApp()
  const storage = getFirebaseStorage(app)
  return storage.bucket()
}
