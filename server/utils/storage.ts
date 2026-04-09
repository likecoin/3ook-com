import { createHash, randomUUID } from 'crypto'
import { getStorage as getFirebaseStorage } from 'firebase-admin/storage'

function getDefaultBucket() {
  const app = getFirebaseApp()
  const storage = getFirebaseStorage(app)
  return storage.bucket()
}

export function generateTTSCacheKey(language: string, voiceId: string, text: string, model: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  // Create a hash of the text to avoid filesystem issues with special characters
  const textHash = createHash('sha256').update(text).digest('hex')
  return `${config.ttsCacheBucketPrefix}/${model}/${language}/${voiceId}/${textHash}.mp3`
}

export function getTTSCacheBucket() {
  const config = useRuntimeConfig()
  const bucketName = config.ttsCacheBucketPrefix
  if (!bucketName) {
    return null
  }
  return getDefaultBucket()
}

export function generateCustomVoiceTTSCacheKey(wallet: string, language: string, text: string, model: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  const textHash = createHash('sha256').update(text).digest('hex')
  return `${config.ttsCacheBucketPrefix}/custom-voices/${wallet}/${model}/${language}/${textHash}.mp3`
}

export function getCustomVoiceTTSCachePrefix(wallet: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  return `${config.ttsCacheBucketPrefix}/custom-voices/${wallet}/`
}

export function getCustomVoiceAudioPrefix(wallet: string): string {
  const config = useRuntimeConfig()
  if (!config.customVoiceBucketPrefix) {
    throw new Error('Custom voice bucket is not configured')
  }
  return `${config.customVoiceBucketPrefix}/${wallet}/source-audio.`
}

export function getCustomVoiceAudioPath(wallet: string, ext: string): string {
  return `${getCustomVoiceAudioPrefix(wallet)}${ext}`
}

export function getCustomVoicePromptAudioPrefix(wallet: string): string {
  const config = useRuntimeConfig()
  if (!config.customVoiceBucketPrefix) {
    throw new Error('Custom voice bucket is not configured')
  }
  return `${config.customVoiceBucketPrefix}/${wallet}/prompt-audio.`
}

export function getCustomVoicePromptAudioPath(wallet: string, ext: string): string {
  return `${getCustomVoicePromptAudioPrefix(wallet)}${ext}`
}

export function getCustomVoiceAvatarPrefix(wallet: string): string {
  const config = useRuntimeConfig()
  if (!config.customVoiceBucketPrefix) {
    throw new Error('Custom voice bucket is not configured')
  }
  return `${config.customVoiceBucketPrefix}/${wallet}/avatar.`
}

export function getCustomVoiceAvatarPath(wallet: string, ext: string): string {
  return `${getCustomVoiceAvatarPrefix(wallet)}${ext}`
}

export function getCustomVoiceStorageBucket() {
  const config = useRuntimeConfig()
  if (!config.customVoiceBucketPrefix) {
    return null
  }
  return getDefaultBucket()
}

export function generateFirebaseDownloadToken(): string {
  return randomUUID()
}

export function getFirebaseStorageDownloadURL(bucketName: string, filePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`
}

export type StorageFile = ReturnType<NonNullable<ReturnType<typeof getTTSCacheBucket>>['file']>

export async function getOrCreatePersistentDownloadURL(file: StorageFile): Promise<string> {
  const [metadata] = await file.getMetadata()
  let token = metadata.metadata?.firebaseStorageDownloadTokens as string | undefined
  if (!token) {
    token = generateFirebaseDownloadToken()
    await file.setMetadata({
      metadata: { firebaseStorageDownloadTokens: token },
    })
  }
  return getFirebaseStorageDownloadURL(file.bucket.name, file.name, token)
}

const CUSTOM_VOICE_SIGNED_URL_TTL_MS = 60 * 60 * 1000

export async function getEphemeralSignedDownloadURL(file: StorageFile): Promise<string> {
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + CUSTOM_VOICE_SIGNED_URL_TTL_MS,
  })
  return url
}
