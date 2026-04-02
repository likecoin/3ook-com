export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({ statusCode: 401, message: 'WALLET_NOT_FOUND' })
  }

  const nftClassId = getRouterParam(event, 'nftClassId')
  if (!nftClassId) {
    throw createError({ statusCode: 400, message: 'MISSING_NFT_CLASS_ID' })
  }

  const affiliateVoice = await getAffiliateVoice(wallet, nftClassId)
  if (!affiliateVoice) return null

  return {
    voiceId: affiliateVoice.voiceId,
    voiceName: affiliateVoice.voiceName,
    voiceLanguage: affiliateVoice.voiceLanguage,
    affiliateFrom: affiliateVoice.affiliateFrom,
  }
})
