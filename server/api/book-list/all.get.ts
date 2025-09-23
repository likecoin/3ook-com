export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet

  try {
    const bookList = await fetchUserBookList(userWallet)
    return {
      items: bookList,
    }
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get book list',
    })
  }
})
