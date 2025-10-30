import { H3Error } from 'h3'
import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  try {
    const tagId = getRouterParams(event).id
    if (!tagId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'MISSING_TAG_ID',
      })
    }

    const result = await fetchAirtableCMSTagById(tagId)
    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: 'TAG_NOT_FOUND',
      })
    }

    setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
    return result
  }
  catch (error) {
    if (error instanceof H3Error) {
      throw error
    }

    if (error instanceof FetchError) {
      const { statusCode: code, data } = error
      const type = data?.error?.type
      if (code === 401 && type === 'AUTHENTICATION_REQUIRED') {
        throw createError({
          status: 401,
          message: 'INVALID_API_SECRET',
        })
      }
    }
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UNEXPECTED_ERROR',
    })
  }
})
