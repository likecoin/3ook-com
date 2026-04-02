import * as v from 'valibot'

const AffiliateVoiceBodySchema = v.object({
  nftClassId: v.pipe(v.string(), v.nonEmpty()),
  voiceId: v.pipe(v.string(), v.nonEmpty()),
  voiceName: v.pipe(v.string(), v.nonEmpty()),
  voiceLanguage: v.optional(v.string()),
  affiliateFrom: v.pipe(v.string(), v.nonEmpty()),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const body = await readValidatedBody(event, createValidator(AffiliateVoiceBodySchema))

  await setAffiliateVoice(wallet, body.nftClassId, {
    voiceId: body.voiceId,
    voiceName: body.voiceName,
    voiceLanguage: body.voiceLanguage,
    affiliateFrom: body.affiliateFrom,
  })

  return { success: true }
})
