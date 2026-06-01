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
