import type { AffiliatePublicConfig } from '~/shared/types/affiliate'
import { getAffiliateConfig } from '~/server/utils/affiliate'
import { fetchLikeCoinNFTClassAggregatedMetadataById } from '~/shared/utils/api'

export default defineEventHandler(async (event): Promise<AffiliatePublicConfig> => {
  const likerId = getRouterParam(event, 'likerId')
  if (!likerId) {
    throw createError({ statusCode: 400, message: 'MISSING_LIKER_ID' })
  }

  const config = await getAffiliateConfig(likerId)
  if (!config?.active) return { active: false }

  let giftBookName: string | undefined
  let giftBookCover: string | undefined

  if (config.giftClassId) {
    try {
      const metadata = await fetchLikeCoinNFTClassAggregatedMetadataById(
        config.giftClassId,
        { include: ['bookstore'] },
      )
      giftBookName = metadata?.bookstoreInfo?.name
      giftBookCover = metadata?.bookstoreInfo?.thumbnailUrl
    }
    catch { /* ignore */ }
  }

  return {
    active: true,
    giftClassId: config.giftClassId,
    giftBookName,
    giftBookCover,
    giftOnTrial: config.giftOnTrial,
    affiliateClassIds: config.affiliateClassIds,
    customVoices: config.customVoices.map(v => ({
      id: v.id,
      name: v.name,
      language: v.language,
      avatarUrl: v.avatarUrl,
    })),
  }
})
