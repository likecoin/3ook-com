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

// Narrow a possibly comma-separated token list (Firebase supports multiple
// tokens per file for rotation) to one usable token.
function firstToken(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  return raw.split(',').map(t => t.trim()).find(Boolean)
}

// Optimistic concurrency: concurrent first-time mints on the same file would
// otherwise race on setMetadata and hand out URLs for tokens that get
// immediately overwritten.
const TOKEN_MINT_MAX_ATTEMPTS = 3

export async function getOrCreatePersistentDownloadURL(file: StorageFile): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const [metadata] = await file.getMetadata()
    const existingToken = firstToken(metadata.metadata?.firebaseStorageDownloadTokens)
    if (existingToken) {
      return getFirebaseStorageDownloadURL(file.bucket.name, file.name, existingToken)
    }
    const newToken = generateFirebaseDownloadToken()
    try {
      await file.setMetadata(
        { metadata: { ...metadata.metadata, firebaseStorageDownloadTokens: newToken } },
        { ifMetagenerationMatch: metadata.metageneration },
      )
      return getFirebaseStorageDownloadURL(file.bucket.name, file.name, newToken)
    }
    catch (error) {
      const code = (error as { code?: number }).code
      if (code !== 412 || attempt >= TOKEN_MINT_MAX_ATTEMPTS) throw error
    }
  }
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
