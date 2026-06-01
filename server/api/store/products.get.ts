import { fetchBookstoreCMSProductsByTagId, respondWithBookstoreAPI } from '~~/server/utils/bookstore'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const tagRaw = Array.isArray(query.tag) ? query.tag[0] : query.tag
  const tag = tagRaw ? String(tagRaw) : ''
  if (!tag) {
    throw createError({ statusCode: 400, statusMessage: 'TAG_REQUIRED' })
  }
  return respondWithBookstoreAPI(
    event,
    opts => fetchBookstoreCMSProductsByTagId(tag, opts),
    { notFoundStatusMessage: 'TAG_NOT_FOUND' },
  )
})
