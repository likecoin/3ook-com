import type { FileUploadResult } from 'minimax-speech-ts'
import type { CustomVoiceData } from '~/shared/types/custom-voice'
import { LANG_MAPPING } from '~/server/utils/tts-minimax'
import {
  CUSTOM_VOICE_ALLOWED_AUDIO_TYPES,
  CUSTOM_VOICE_ALLOWED_AVATAR_TYPES,
  CUSTOM_VOICE_MAX_AUDIO_SIZE,
  CUSTOM_VOICE_MAX_AVATAR_SIZE,
  CUSTOM_VOICE_MAX_PROMPT_AUDIO_SIZE,
  CustomVoiceFieldsSchema,
} from '~/server/schemas/custom-voice'

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }
  return map[mime] || 'bin'
}

export default defineEventHandler(async (event): Promise<CustomVoiceData> => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const isLikerPlus = session.user.isLikerPlus || false
  if (!isLikerPlus) {
    throw createError({ statusCode: 403, message: 'REQUIRE_LIKER_PLUS' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'MISSING_FORM_DATA' })
  }

  let audioPart: { data: Buffer, type?: string, filename?: string } | undefined
  let avatarPart: { data: Buffer, type?: string, filename?: string } | undefined
  let promptAudioPart: { data: Buffer, type?: string, filename?: string } | undefined
  const textFields: Record<string, string> = {}

  for (const part of formData) {
    if (part.name === 'audio') {
      audioPart = part
    }
    else if (part.name === 'avatar') {
      avatarPart = part
    }
    else if (part.name === 'promptAudio') {
      promptAudioPart = part
    }
    else if (part.name && ['voiceName', 'voiceLanguage', 'promptText'].includes(part.name)) {
      textFields[part.name] = part.data.toString('utf-8').trim()
    }
  }

  // Validate text fields with schema
  const { voiceName, voiceLanguage, promptText } = createValidator(CustomVoiceFieldsSchema)(textFields)

  // Validate file parts
  validateFilePart(audioPart, {
    fieldName: 'audio',
    allowedTypes: CUSTOM_VOICE_ALLOWED_AUDIO_TYPES,
    maxSize: CUSTOM_VOICE_MAX_AUDIO_SIZE,
    errorMessages: { missing: 'MISSING_AUDIO', invalidFormat: 'INVALID_AUDIO_FORMAT', tooLarge: 'AUDIO_TOO_LARGE' },
  })
  validateFilePart(avatarPart, {
    fieldName: 'avatar',
    allowedTypes: CUSTOM_VOICE_ALLOWED_AVATAR_TYPES,
    maxSize: CUSTOM_VOICE_MAX_AVATAR_SIZE,
    required: false,
    errorMessages: { invalidFormat: 'INVALID_AVATAR_FORMAT', tooLarge: 'AVATAR_TOO_LARGE' },
  })
  validateFilePart(promptAudioPart, {
    fieldName: 'promptAudio',
    allowedTypes: CUSTOM_VOICE_ALLOWED_AUDIO_TYPES,
    maxSize: CUSTOM_VOICE_MAX_PROMPT_AUDIO_SIZE,
    required: false,
    errorMessages: { invalidFormat: 'INVALID_PROMPT_AUDIO_FORMAT', tooLarge: 'PROMPT_AUDIO_TOO_LARGE' },
  })

  const client = getMiniMaxSpeechClient()
  const voiceBucket = getCustomVoiceStorageBucket()
  const ttsBucket = getTTSCacheBucket()

  const existingVoicePromise = getCustomVoice(wallet)

  const oldMinimaxVoiceDeleted: Promise<void> = existingVoicePromise.then(async (existing) => {
    if (!existing?.voiceId) return
    await client.deleteVoice({
      voiceType: 'voice_cloning',
      voiceId: existing.voiceId,
    }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete old Minimax voice:', error)
    })
  })

  const oldTTSCacheDeleted: Promise<void> = existingVoicePromise.then(async (existing) => {
    if (!existing?.voiceId || !ttsBucket) return
    await ttsBucket.deleteFiles({ prefix: getCustomVoiceTTSCachePrefix(wallet) }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete TTS cache files:', error)
    })
  })

  const oldAudioDeleted: Promise<void> = existingVoicePromise.then(async (existing) => {
    if (!existing?.voiceId || !voiceBucket) return
    await voiceBucket.deleteFiles({ prefix: getCustomVoiceAudioPrefix(wallet) }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete old audio files:', error)
    })
  })

  const oldPromptDeleted: Promise<void> = existingVoicePromise.then(async (existing) => {
    if (!existing?.voiceId || !voiceBucket) return
    await voiceBucket.deleteFiles({ prefix: getCustomVoicePromptAudioPrefix(wallet) }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete old prompt audio files:', error)
    })
  })

  const oldAvatarDeleted: Promise<void> = existingVoicePromise.then(async (existing) => {
    if (!existing?.voiceId || !voiceBucket) return
    await voiceBucket.deleteFiles({ prefix: getCustomVoiceAvatarPrefix(wallet) }).catch((error) => {
      console.warn('[CustomVoice] Failed to delete old avatar files:', error)
    })
  })

  const audioExt = getExtFromMime(audioPart!.type!)
  const audioBlob = new File([audioPart!.data], `voice.${audioExt}`, { type: audioPart!.type })
  const audioUploadPromise = client.uploadFile(audioBlob, 'voice_clone')

  let promptUploadPromise: Promise<FileUploadResult | undefined> = Promise.resolve(undefined)
  if (promptAudioPart?.data && promptAudioPart.type) {
    const promptExt = getExtFromMime(promptAudioPart.type)
    const promptBlob = new File([promptAudioPart.data], `prompt.${promptExt}`, { type: promptAudioPart.type })
    promptUploadPromise = client.uploadFile(promptBlob, 'prompt_audio')
  }
  // Prevent orphan rejection if audio upload rejects first in Promise.all
  promptUploadPromise.catch(() => {})

  const [uploadResult, promptUploadResult] = await Promise.all([
    audioUploadPromise,
    promptUploadPromise,
  ])
  if (!uploadResult) throw createError({ statusCode: 500, message: 'UPLOAD_FAILED' })
  const fileId = uploadResult.file.fileId

  const walletPrefix = wallet.slice(0, 8).toLowerCase()
  const timestamp = Date.now()
  const minimaxVoiceId = `cv_${walletPrefix}_${timestamp}`

  const languageBoost = voiceLanguage
    ? LANG_MAPPING[voiceLanguage as keyof typeof LANG_MAPPING]
    : undefined

  const clonePrompt = promptUploadResult
    ? { promptAudio: promptUploadResult.file.fileId, promptText: promptText || '' }
    : undefined

  const cloneVoicePromise = client.cloneVoice({
    fileId,
    voiceId: minimaxVoiceId,
    clonePrompt,
    languageBoost,
    needNoiseReduction: true,
    needVolumeNormalization: true,
  })

  const audioSavePromise: Promise<string | undefined> = (async () => {
    await oldAudioDeleted
    if (!voiceBucket) return undefined
    const path = getCustomVoiceAudioPath(wallet, audioExt)
    await voiceBucket.file(path).save(audioPart!.data, {
      metadata: { contentType: audioPart!.type },
    })
    return path
  })()

  const promptSavePromise: Promise<void> = (async () => {
    await oldPromptDeleted
    if (!voiceBucket || !promptAudioPart?.data || !promptAudioPart.type) return
    try {
      const promptStorageExt = getExtFromMime(promptAudioPart.type)
      const promptPath = getCustomVoicePromptAudioPath(wallet, promptStorageExt)
      await voiceBucket.file(promptPath).save(promptAudioPart.data, {
        metadata: { contentType: promptAudioPart.type },
      })
    }
    catch (error) {
      console.warn('[CustomVoice] Failed to save prompt audio:', error)
    }
  })()

  const avatarSavePromise: Promise<{ avatarPath?: string, avatarUrl?: string }> = (async () => {
    await oldAvatarDeleted
    if (!voiceBucket || !avatarPart?.data || !avatarPart.type) return {}
    try {
      const avatarExt = getExtFromMime(avatarPart.type)
      const avatarPath = getCustomVoiceAvatarPath(wallet, avatarExt)
      const downloadToken = generateFirebaseDownloadToken()
      await voiceBucket.file(avatarPath).save(avatarPart.data, {
        metadata: {
          contentType: avatarPart.type,
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      })
      return {
        avatarPath,
        avatarUrl: getFirebaseStorageDownloadURL(voiceBucket.name, avatarPath, downloadToken),
      }
    }
    catch (error) {
      console.warn('[CustomVoice] Failed to save avatar:', error)
      return {}
    }
  })()

  const [, audioPath, , avatarResult] = await Promise.all([
    cloneVoicePromise,
    audioSavePromise,
    promptSavePromise,
    avatarSavePromise,
    oldMinimaxVoiceDeleted,
    oldTTSCacheDeleted,
  ])
  const { avatarPath, avatarUrl } = avatarResult

  await setCustomVoice(wallet, {
    voiceId: minimaxVoiceId,
    voiceName,
    voiceLanguage: voiceLanguage || undefined,
    audioPath,
    avatarPath,
    avatarUrl,
  })

  publishEvent(event, 'CustomVoiceCreate', {
    evmWallet: wallet,
    voiceId: minimaxVoiceId,
    voiceName,
    voiceLanguage: voiceLanguage || undefined,
  })

  return {
    voiceId: minimaxVoiceId,
    voiceName,
    voiceLanguage: voiceLanguage || undefined,
    avatarUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
})
