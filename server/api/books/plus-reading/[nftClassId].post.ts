import { NFTClassIdParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  // Plus-gated: only active subscribers can borrow a book.
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)
  if (!isLikerPlus) {
    throw createError({
      statusCode: 403,
      message: 'PLUS_SUBSCRIPTION_REQUIRED',
    })
  }

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(NFTClassIdParamsSchema))

  // Gate on Plus-reading eligibility before stamping the borrow: `plusBorrowedAt`
  // is the sole gate the reading-time heartbeat uses to accrue rev-share, so an
  // unchecked borrow could divert share to an ineligible book. Fetch is SWR-cached.
  const metadata = await fetchCachedNFTClassAggregatedMetadata(nftClassId, ['bookstore'])
  if (!metadata?.bookstoreInfo?.isPlusReadingEnabled) {
    throw createError({
      statusCode: 403,
      message: 'BOOK_NOT_PLUS_READING_ENABLED',
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
