import { BookIdParamsSchema } from '~/server/schemas/params'
import { BookSettingsUpdateSchema } from '~/shared/schemas/book-settings'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(BookIdParamsSchema))
  const body = await readValidatedBody(event, createValidator(BookSettingsUpdateSchema))

  try {
    await updateBookSettings(walletAddress, nftClassId, body)
    return { success: true }
  }
  catch (error) {
    console.error(`Failed to update book settings for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_UPDATE_BOOK_SETTINGS',
    })
  }
})
