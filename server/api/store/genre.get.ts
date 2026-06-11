import { FetchError } from 'ofetch'

import { StoreGenreQuerySchema } from '~~/server/schemas/store'
import { getBookstoreScopedKey } from '~~/shared/utils/bookstore'

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, createValidator(StoreGenreQuerySchema))
    const rawGenre = (Array.isArray(query.q) ? query.q[0] : query.q)!
    const genre = sanitizeAirtableGenre(rawGenre)
    const pageSize = parseBookstorePageSize(query.limit)
    const offset = (Array.isArray(query.offset) ? query.offset[0] : query.offset) || undefined
    const isLibrary = (Array.isArray(query.library) ? query.library[0] : query.library) === '1'

    if (offset) {
      setHeader(event, 'cache-control', 'no-store')
      return await fetchAirtableCMSPublicationsByGenre(genre, { pageSize, offset, isLibrary })
    }

    const result = await fetchWithAirtableCache(
      getBookstoreScopedKey(`genre:${genre}:${pageSize}`, isLibrary),
      () => fetchAirtableCMSPublicationsByGenre(genre, { pageSize, isLibrary }),
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
