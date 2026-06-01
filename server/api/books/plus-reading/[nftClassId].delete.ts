import { NFTClassIdParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  // Session-only: dropping a borrow (DNF/Archive) must work even after Plus
  // lapses, so an expired user can clear locked books from their shelf.
  const wallet = await requireUserWallet(event)

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(NFTClassIdParamsSchema))

  try {
    await dropPlusReadingBook(wallet, nftClassId)
    return { success: true }
  }
  catch (error) {
    console.error(`Failed to drop plus reading book ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_DROP_PLUS_READING_BOOK',
    })
  }
})
