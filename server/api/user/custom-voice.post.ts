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

  const existingVoice = await getCustomVoice(wallet)
  if (existingVoice?.voiceId) {
    try {
      const client = getMiniMaxSpeechClient()
      await client.deleteVoice({
        voiceType: 'voice_cloning',
        voiceId: existingVoice.voiceId,
      })
    }
    catch (error) {
      console.warn('[CustomVoice] Failed to delete old Minimax voice:', error)
    }

    const ttsBucket = getTTSCacheBucket()
    if (ttsBucket) {
      try {
        const prefix = getCustomVoiceTTSCachePrefix(wallet)
        await ttsBucket.deleteFiles({ prefix })
      }
      catch (error) {
        console.warn('[CustomVoice] Failed to delete TTS cache files:', error)
      }
    }

    const voiceBucket = getCustomVoiceStorageBucket()
    if (voiceBucket) {
      try {
        const sourcePrefix = getCustomVoiceAudioPrefix(wallet)
        const promptPrefix = getCustomVoicePromptAudioPrefix(wallet)
        await Promise.all([
          voiceBucket.deleteFiles({ prefix: sourcePrefix }),
          voiceBucket.deleteFiles({ prefix: promptPrefix }),
        ])
      }
      catch (error) {
        console.warn('[CustomVoice] Failed to delete old voice files:', error)
      }
    }
  }

  const client = getMiniMaxSpeechClient()
  const audioExt = getExtFromMime(audioPart!.type!)
  const audioBlob = new File([audioPart!.data], `voice.${audioExt}`, { type: audioPart!.type })

  const audioUploadPromise = client.uploadFile(audioBlob, 'voice_clone')

  let promptUploadResult: FileUploadResult | undefined
  if (promptAudioPart?.data && promptAudioPart.type) {
    const promptExt = getExtFromMime(promptAudioPart.type)
    const promptBlob = new File([promptAudioPart.data], `prompt.${promptExt}`, { type: promptAudioPart.type })
    promptUploadResult = await client.uploadFile(promptBlob, 'prompt_audio')
  }

  const uploadResult = await audioUploadPromise
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

  await client.cloneVoice({
    fileId,
    voiceId: minimaxVoiceId,
    clonePrompt,
    languageBoost,
    needNoiseReduction: true,
    needVolumeNormalization: true,
  })

  const bucket = getCustomVoiceStorageBucket()
  let audioPath: string | undefined
  let avatarPath: string | undefined
  let avatarUrl: string | undefined

  if (bucket) {
    audioPath = getCustomVoiceAudioPath(wallet, audioExt)
    const audioFile = bucket.file(audioPath)
    await audioFile.save(audioPart!.data, {
      metadata: { contentType: audioPart!.type },
    })

    if (promptAudioPart?.data && promptAudioPart.type) {
      try {
        const promptStorageExt = getExtFromMime(promptAudioPart.type)
        const promptPath = getCustomVoicePromptAudioPath(wallet, promptStorageExt)
        const promptStorageFile = bucket.file(promptPath)
        await promptStorageFile.save(promptAudioPart.data, {
          metadata: { contentType: promptAudioPart.type },
        })
      }
      catch (error) {
        console.warn('[CustomVoice] Failed to save prompt audio:', error)
      }
    }

    if (avatarPart?.data && avatarPart.type) {
      try {
        const avatarExt = getExtFromMime(avatarPart.type)
        avatarPath = getCustomVoiceAvatarPath(wallet, avatarExt)
        const avatarFile = bucket.file(avatarPath)
        const downloadToken = generateFirebaseDownloadToken()
        await avatarFile.save(avatarPart.data, {
          metadata: {
            contentType: avatarPart.type,
            metadata: { firebaseStorageDownloadTokens: downloadToken },
          },
        })
        avatarUrl = getFirebaseStorageDownloadURL(bucket.name, avatarPath, downloadToken)
      }
      catch (error) {
        console.warn('[CustomVoice] Failed to save avatar:', error)
        avatarPath = undefined
      }
    }
  }

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
