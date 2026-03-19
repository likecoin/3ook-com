import { FetchError } from 'ofetch'

import { StoreProductsQuerySchema } from '~/server/schemas/store'

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, createValidator(StoreProductsQuerySchema))
    const tagId = (Array.isArray(query.tag) ? query.tag[0] : query.tag) || 'latest'
    const pageSize = Math.min(Math.max(1, Number((Array.isArray(query.limit) ? query.limit[0] : query.limit)) || 100), 100)
    const offset = (Array.isArray(query.offset) ? query.offset[0] : query.offset) || undefined

    // Paginated requests always go live
    if (offset) {
      setHeader(event, 'cache-control', 'no-store')
      return await fetchAirtableCMSProductsByTagId(tagId, { pageSize, offset })
    }

    const result = await fetchWithAirtableCache(
      `products:${tagId}:${pageSize}`,
      () => fetchAirtableCMSProductsByTagId(tagId, { pageSize }),
    )
    setHeader(event, 'cache-control', 'public, max-age=60')
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
      if (code === 422) {
        throw createError({
          status: 422,
          message: 'OFFSET_EXPIRED',
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
