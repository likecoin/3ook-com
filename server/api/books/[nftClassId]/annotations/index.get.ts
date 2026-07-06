import { BookIdParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  const walletAddress = await requireUserWallet(event)

  const { nftClassId } = await getValidatedRouterParams(event, createValidator(BookIdParamsSchema))

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  try {
    const annotations = await getAnnotations(walletAddress, nftClassId)
    return { annotations }
  }
  catch (error) {
    console.error(`Failed to get annotations for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_ANNOTATIONS',
    })
  }
})
