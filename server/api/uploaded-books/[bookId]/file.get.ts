import { createHash } from 'node:crypto'
import { UploadedBookIdParamsSchema } from '~/server/schemas/uploaded-book'

const CONTENT_TYPE_MAP: Record<string, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
}

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const session = await requireUserSession(event)
  if (!session.user.isLikerPlus) {
    throw createError({ statusCode: 402, message: 'REQUIRE_LIKER_PLUS' })
  }

  const { bookId } = await getValidatedRouterParams(event, createValidator(UploadedBookIdParamsSchema))

  const book = await getUploadedBook(wallet, bookId)
  if (!book) {
    throw createError({ statusCode: 404, message: 'BOOK_NOT_FOUND' })
  }

  const bucket = getUploadedBooksStorageBucket()
  if (!bucket) {
    throw createError({ statusCode: 500, message: 'STORAGE_NOT_CONFIGURED' })
  }

  const file = bucket.file(book.storagePath)
  const totalSize = book.fileSize
  const contentType = CONTENT_TYPE_MAP[book.contentType]

  const etag = `"${createHash('sha256').update(book.storagePath).digest('hex').substring(0, 16)}"`
  setHeader(event, 'content-type', contentType)
  // `no-cache` (not `no-store`): the browser may cache, but must revalidate
  // with the server on every use so an expired Plus member can't keep
  // reading from a stale cache. The etag above makes 304 revalidation cheap.
  setHeader(event, 'cache-control', 'private, no-cache')
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'vary', 'Range')
  setHeader(event, 'etag', etag)

  const rangeHeader = getHeader(event, 'range')
  // Answer non-range revalidations with 304 so the browser can reuse the
  // cached body without redownloading. Range requests fall through — the
  // browser handles them via its own If-Range logic.
  if (!rangeHeader && getHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304)
    return null
  }
  if (rangeHeader && totalSize) {
    const range = parseRangeHeader(rangeHeader, totalSize)
    if (range) {
      const { start, end } = range
      setResponseStatus(event, 206)
      setHeader(event, 'content-range', `bytes ${start}-${end}/${totalSize}`)
      setHeader(event, 'content-length', end - start + 1)
      return sendStream(event, file.createReadStream({ start, end }))
    }
  }

  if (totalSize) {
    setHeader(event, 'content-length', totalSize)
  }
  return sendStream(event, file.createReadStream())
})
