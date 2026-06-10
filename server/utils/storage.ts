import { createHash, randomUUID } from 'crypto'
import { getStorage as getFirebaseStorage } from 'firebase-admin/storage'

function getDefaultBucket() {
  const app = getFirebaseApp()
  const storage = getFirebaseStorage(app)
  return storage.bucket()
}

// All TTS audio is cached under its resolved Minimax voice id so a voice
// version bump (e.g. three_book_pazu_v3 -> _v4) or a re-cloned custom voice
// (new cv_<wallet>_<timestamp> id) lands on a fresh path automatically, instead
// of serving stale audio under a stable alias. Voice id leads the path so a
// single voice's audio can be prefix-purged (see getTTSCachePrefixForVoice).
export function generateTTSCacheKey(minimaxVoiceId: string, language: string, text: string, model: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  // Create a hash of the text to avoid filesystem issues with special characters
  const textHash = createHash('sha256').update(text).digest('hex')
  return `${config.ttsCacheBucketPrefix}/${minimaxVoiceId}/${model}/${language}/${textHash}.mp3`
}

export function getTTSCacheBucket() {
  const config = useRuntimeConfig()
  const bucketName = config.ttsCacheBucketPrefix
  if (!bucketName) {
    return null
  }
  return getDefaultBucket()
}

// Prefix matching every cached segment for one Minimax voice, used to purge a
// custom voice's audio when it is deleted or re-cloned. The trailing slash
// keeps cv_xxx_123 from matching cv_xxx_1234.
export function getTTSCachePrefixForVoice(minimaxVoiceId: string): string {
  const config = useRuntimeConfig()
  if (!config.ttsCacheBucketPrefix) {
    throw new Error('TTS cache bucket is not configured')
  }
  return `${config.ttsCacheBucketPrefix}/${minimaxVoiceId}/`
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

export function getUploadedBookStoragePath(wallet: string, bookId: string, ext: string): string {
  const config = useRuntimeConfig()
  if (!config.uploadedBooksBucketPrefix) {
    throw createError({ statusCode: 500, message: 'STORAGE_NOT_CONFIGURED' })
  }
  return `${config.uploadedBooksBucketPrefix}/${wallet}/${bookId}.${ext}`
}

export function getUploadedBookCoverStoragePath(wallet: string, bookId: string, ext: string): string {
  const config = useRuntimeConfig()
  if (!config.uploadedBooksBucketPrefix) {
    throw createError({ statusCode: 500, message: 'STORAGE_NOT_CONFIGURED' })
  }
  return `${config.uploadedBooksBucketPrefix}/${wallet}/${bookId}.cover.${ext}`
}

export function getUploadedBooksStorageBucket() {
  const config = useRuntimeConfig()
  if (!config.uploadedBooksBucketPrefix) {
    return null
  }
  return getDefaultBucket()
}

const UPLOADED_BOOK_SIGNED_URL_EXPIRY_MS = 10 * 60 * 1000

export async function createUploadedBookSignedUploadURL(
  storagePath: string,
  mimeType: string,
  fileSize: number,
): Promise<{ uploadURL: string, expiresAt: number }> {
  const bucket = getUploadedBooksStorageBucket()
  if (!bucket) {
    throw createError({ statusCode: 500, message: 'STORAGE_NOT_CONFIGURED' })
  }
  const expiresAt = Date.now() + UPLOADED_BOOK_SIGNED_URL_EXPIRY_MS
  // Bind the declared size into the signed URL so GCS rejects any PUT whose
  // body exceeds it — prevents a client from uploading a multi-GB body under
  // a URL minted for a small file. Client must echo the same range header.
  const contentLengthRange = `0,${fileSize}`
  const [uploadURL] = await bucket.file(storagePath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType: mimeType,
    extensionHeaders: {
      'x-goog-content-length-range': contentLengthRange,
      // Create-only: the URL can upload the object exactly once. Prevents
      // anyone holding the still-valid signed URL from overwriting the
      // content after finalize (which would undermine our stored size /
      // ETag assumptions and the immutability the reader relies on).
      'x-goog-if-generation-match': '0',
    },
  })
  return { uploadURL, expiresAt }
}

export function generateFirebaseDownloadToken(): string {
  return randomUUID()
}

export function getFirebaseStorageDownloadURL(bucketName: string, filePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`
}
