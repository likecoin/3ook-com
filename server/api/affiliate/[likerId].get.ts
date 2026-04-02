import { fetchLikeCoinNFTClassAggregatedMetadataById, getLikeCoinAPIFetch } from '~/shared/utils/api'

interface AffiliateConfigResponse {
  active: boolean
  giftClassId?: string
  customVoiceName?: string
}

export default defineEventHandler(async (event) => {
  const likerId = getRouterParam(event, 'likerId')
  if (!likerId) {
    throw createError({ statusCode: 400, message: 'MISSING_LIKER_ID' })
  }

  const affiliateData = await getLikeCoinAPIFetch()<AffiliateConfigResponse>(
    `/plus/affiliate/${likerId}`,
  ).catch(() => null)

  if (!affiliateData?.active || !affiliateData.giftClassId) {
    return { active: false }
  }

  let giftBookName: string | undefined
  let giftBookCover: string | undefined

  try {
    const metadata = await fetchLikeCoinNFTClassAggregatedMetadataById(
      affiliateData.giftClassId,
      { include: ['bookstore'] },
    )
    giftBookName = metadata?.bookstoreInfo?.name
    giftBookCover = metadata?.bookstoreInfo?.thumbnailUrl
  }
  catch { /* ignore */ }

  return {
    active: true,
    giftClassId: affiliateData.giftClassId,
    giftBookName,
    giftBookCover,
    customVoiceName: affiliateData.customVoiceName,
  }
})
