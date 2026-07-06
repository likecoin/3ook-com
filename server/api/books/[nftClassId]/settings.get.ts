import { BookIdParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  const walletAddress = await requireUserWallet(event)

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(BookIdParamsSchema))

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  try {
    const settings = await getBookSettings(walletAddress, nftClassId)
    return settings || {}
  }
  catch (error) {
    console.error(`Failed to get book settings for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_BOOK_SETTINGS',
    })
  }
})
