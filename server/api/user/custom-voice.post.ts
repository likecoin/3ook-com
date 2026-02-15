import type { CustomVoiceData } from '~/shared/types/custom-voice'

const ALLOWED_VOICE_LANGUAGES = ['zh-HK', 'zh-TW']
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png']
const MAX_AUDIO_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

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
  let voiceName = ''
  let voiceLanguage = ''

  for (const part of formData) {
    if (part.name === 'audio') {
      audioPart = part
    }
    else if (part.name === 'avatar') {
      avatarPart = part
    }
    else if (part.name === 'voiceName') {
      voiceName = part.data.toString('utf-8')
    }
    else if (part.name === 'voiceLanguage') {
      voiceLanguage = part.data.toString('utf-8')
    }
  }

  if (!audioPart?.data) {
    throw createError({ statusCode: 400, message: 'MISSING_AUDIO' })
  }

  if (!audioPart.type || !ALLOWED_AUDIO_TYPES.includes(audioPart.type)) {
    throw createError({ statusCode: 400, message: 'INVALID_AUDIO_FORMAT' })
  }

  if (audioPart.data.length > MAX_AUDIO_SIZE) {
    throw createError({ statusCode: 400, message: 'AUDIO_TOO_LARGE' })
  }

  if (avatarPart?.data) {
    if (!avatarPart.type || !ALLOWED_AVATAR_TYPES.includes(avatarPart.type)) {
      throw createError({ statusCode: 400, message: 'INVALID_AVATAR_FORMAT' })
    }
    if (avatarPart.data.length > MAX_AVATAR_SIZE) {
      throw createError({ statusCode: 400, message: 'AVATAR_TOO_LARGE' })
    }
  }

  if (!voiceName) {
    throw createError({ statusCode: 400, message: 'MISSING_VOICE_NAME' })
  }

  if (voiceLanguage && !ALLOWED_VOICE_LANGUAGES.includes(voiceLanguage)) {
    throw createError({ statusCode: 400, message: 'INVALID_VOICE_LANGUAGE' })
  }

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
  }

  const client = getMiniMaxSpeechClient()
  const audioExt = getExtFromMime(audioPart.type!)
  const audioBlob = new File([audioPart.data], `voice.${audioExt}`, { type: audioPart.type })
  const uploadResult = await client.uploadFile(audioBlob, 'voice_clone')
  const fileId = uploadResult.file.fileId

  const walletPrefix = wallet.slice(0, 8).toLowerCase()
  const timestamp = Date.now()
  const minimaxVoiceId = `cv_${walletPrefix}_${timestamp}`

  await client.cloneVoice({
    fileId,
    voiceId: minimaxVoiceId,
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
    await audioFile.save(audioPart.data, {
      metadata: { contentType: audioPart.type },
    })

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

  return {
    voiceId: minimaxVoiceId,
    voiceName,
    voiceLanguage: voiceLanguage || undefined,
    avatarUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
})
