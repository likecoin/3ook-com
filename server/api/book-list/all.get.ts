export default defineEventHandler(async (event) => {
  const userWallet = await requireUserWallet(event)
  setHeader(event, 'cache-control', 'private')

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
