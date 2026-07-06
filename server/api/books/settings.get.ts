import { BookSettingsQuerySchema } from '~~/server/schemas/book-settings'

export default defineEventHandler(async (event) => {
  const walletAddress = await requireUserWallet(event)

  const { nftClassId, nftClassIds } = await getValidatedQuery(event, createValidator(BookSettingsQuerySchema))

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  if (nftClassId) {
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
  }

  if (nftClassIds) {
    const nftClassIdArray = Array.isArray(nftClassIds) ? nftClassIds : [nftClassIds]
    try {
      const settings = await getBatchBookSettings(walletAddress, nftClassIdArray)
      return settings
    }
    catch (error) {
      console.error('Failed to get batch book settings:', error)
      throw createError({
        statusCode: 500,
        message: 'FAILED_TO_GET_BATCH_BOOK_SETTINGS',
      })
    }
  }

  // Defensive fallback: the schema's check already guarantees one is present.
  throw createError({
    statusCode: 400,
    message: 'MISSING_NFT_CLASS_ID_OR_IDS',
  })
})
