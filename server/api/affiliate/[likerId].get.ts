import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'
import { getAffiliateConfig, getAffiliatePlusDiscountAllowed } from '~~/server/utils/affiliate'
import { fetchCachedNFTClassAggregatedMetadata } from '~~/server/utils/likecoin-nft'

export default defineEventHandler(async (event): Promise<AffiliatePublicConfig> => {
  const likerId = getRouterParam(event, 'likerId')
  if (!likerId) {
    throw createError({ statusCode: 400, message: 'MISSING_LIKER_ID' })
  }

  // Sequential, not Promise.all: both getters share one cache entry, and
  // running in parallel on a cold cache would fire two upstream fetches.
  const config = await getAffiliateConfig(likerId)
  const isPlusDiscountAllowed = await getAffiliatePlusDiscountAllowed(likerId)
  if (!config?.active) {
    return { active: false, isPlusDiscountAllowed }
  }

  const giftBooks = await Promise.all(
    (config.giftBooks ?? []).map(async (book) => {
      let name: string | undefined
      let cover: string | undefined
      try {
        const metadata = await fetchCachedNFTClassAggregatedMetadata(
          book.classId,
          ['bookstore'],
        )
        name = metadata?.bookstoreInfo?.name
        cover = metadata?.bookstoreInfo?.thumbnailUrl
      }
      catch { /* ignore */ }
      return {
        classId: book.classId,
        priceIndex: book.priceIndex,
        name,
        cover,
      }
    }),
  )

  return {
    active: true,
    giftBooks,
    giftOnTrial: config.giftOnTrial,
    isPlusDiscountAllowed,
    affiliateClassIds: config.affiliateClassIds,
    affiliatePublisherWallets: config.affiliatePublisherWallets,
    customVoices: config.customVoices.map(v => ({
      id: v.id,
      name: v.name,
      language: v.language,
      avatarUrl: v.avatarUrl,
    })),
  }
})
