export default defineEventHandler(async (event) => {
  // Session-only (not Plus-gated): expired Plus users must still see their
  // borrowed shelf so it can render as locked with a resubscribe CTA.
  const wallet = await requireUserWallet(event)

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  try {
    return await getPlusReadingBooks(wallet)
  }
  catch (error) {
    console.error('Failed to get plus reading books:', error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_PLUS_READING_BOOKS',
    })
  }
})
