import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'
import { LikerIdParamsSchema } from '~~/server/schemas/params'
import { getAffiliateConfig, getAffiliatePlusDiscountAllowed, toPublicAffiliateVoices } from '~~/server/utils/affiliate'
import { fetchCachedNFTClassAggregatedMetadata } from '~~/server/utils/likecoin-nft'

export default defineEventHandler(async (event): Promise<AffiliatePublicConfig> => {
  const { likerId } = await getValidatedRouterParams(event, createValidator(LikerIdParamsSchema))

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
    customVoices: toPublicAffiliateVoices(config.customVoices),
  }
})
