import { NFTClassIdParamsSchema } from '~~/server/schemas/params'
import { getHasFreeEdition } from '~~/shared/utils/bookstore'

export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(NFTClassIdParamsSchema))

  // Gate on Plus-reading eligibility before stamping the borrow: `plusBorrowedAt`
  // is the sole gate the reading-time heartbeat uses to accrue rev-share, so an
  // unchecked borrow could divert share to an ineligible book. Fetch is SWR-cached.
  const bookstoreInfo = (await fetchCachedNFTClassAggregatedMetadata(nftClassId, ['bookstore']))?.bookstoreInfo
  if (!bookstoreInfo?.isPlusReadingEnabled) {
    throw createError({
      statusCode: 403,
      message: 'BOOK_NOT_PLUS_READING_ENABLED',
    })
  }

  // Plus members borrow any Plus-reading book; non-Plus users only free ones.
  // ebook-cors gates the actual file the same way, so a granted borrow always
  // resolves to a readable file.
  if (!isLikerPlus && !getHasFreeEdition(bookstoreInfo.prices)) {
    throw createError({
      statusCode: 403,
      message: 'PLUS_SUBSCRIPTION_REQUIRED',
    })
  }

  try {
    await markPlusReadingBook(wallet, nftClassId)
    return { success: true }
  }
  catch (error) {
    console.error(`Failed to mark plus reading book ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_MARK_PLUS_READING_BOOK',
    })
  }
})
