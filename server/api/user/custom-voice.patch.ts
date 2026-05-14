import { CustomVoicePatchSchema } from '~~/server/schemas/custom-voice'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const isLikerPlus = session.user.isLikerPlus || false
  if (!isLikerPlus) {
    throw createError({ statusCode: 403, message: 'REQUIRE_LIKER_PLUS' })
  }

  const customVoice = await getCustomVoice(wallet)
  if (!customVoice) {
    throw createError({ statusCode: 404, message: 'NO_CUSTOM_VOICE' })
  }

  const fields = await readValidatedBody(event, createValidator(CustomVoicePatchSchema))

  if (fields.voiceName === undefined && fields.voiceLanguage === undefined) {
    throw createError({ statusCode: 400, message: 'NO_FIELDS_TO_UPDATE' })
  }

  await updateCustomVoice(wallet, fields)

  publishEvent(event, 'CustomVoiceUpdate', {
    evmWallet: wallet,
    voiceId: customVoice.voiceId,
    ...fields,
  })

  return fields
})
