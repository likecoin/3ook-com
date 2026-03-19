import { FetchError } from 'ofetch'

import { StoreSearchQuerySchema } from '~/server/schemas/store'

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, createValidator(StoreSearchQuerySchema))
    const searchTerm = (Array.isArray(query.q) ? query.q[0] : query.q)!
    const pageSize = Math.min(Math.max(1, Number((Array.isArray(query.limit) ? query.limit[0] : query.limit)) || 100), 100)
    const offset = (Array.isArray(query.offset) ? query.offset[0] : query.offset) || undefined

    const result = await fetchAirtableCMSPublicationsBySearchTerm(searchTerm, {
      pageSize,
      offset,
    })
    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=600')
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
