export default defineEventHandler(async (event) => {
  try {
    const result = await fetchBookstoreCMSTagsForAll()
    setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
    return result
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UNEXPECTED_ERROR',
    })
  }
})
