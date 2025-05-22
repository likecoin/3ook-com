import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const tagId = (Array.isArray(query.tag) ? query.tag[0] : query.tag) || 'all'
    const pageSize = (Array.isArray(query.limit) ? query.limit[0] : query.limit) || 100
    const offset = (Array.isArray(query.offset) ? query.offset[0] : query.offset) || undefined
    const result = await fetchAirtableCMSProductsByTagId(tagId, {
      pageSize,
      offset,
    })
    return result
  }
  catch (error) {
    if (error instanceof FetchError) {
      const { statusCode: code, data } = error
      const type = data?.error?.type
      if (code === 401 && type === 'AUTHENTICATION_REQUIRED') {
        throw createError({
          status: 401,
          message: 'INVALID_API_SECRET',
        })
      }
      if (code === 422 && type === 'VIEW_NAME_NOT_FOUND') {
        throw createError({
          status: 404,
          message: 'TAG_NOT_FOUND',
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
