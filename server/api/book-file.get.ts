import { Readable } from 'node:stream'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'

import { BookFileQuerySchema } from '~~/server/schemas/book-file'

// Forwarded verbatim from the upstream ebook response. `x-original-content-
// length` is the true (pre-transfer) size the client's progress bar reads;
// `content-length` is intentionally omitted — undici auto-decompresses the
// body, so a forwarded length could mismatch the streamed bytes and truncate
// the file. The body goes out chunked instead.
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-range',
  'accept-ranges',
  'etag',
  'x-original-content-length',
]

/**
 * Same-origin proxy for gated book files. Translates the browser's session
 * cookie into the upstream Bearer JWT server-side so the client no longer
 * needs to read the token from the session to fetch book binaries. Ownership
 * is enforced upstream by `/ebook-cors/`; we forward its status verbatim.
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const token = getSessionToken(session)
  if (!token) {
    throw createError({ statusCode: 401, message: 'TOKEN_NOT_FOUND' })
  }

  const {
    class_id: classId,
    nft_id: nftId,
    index,
    custom_message: customMessage,
  } = await getValidatedQuery(event, createValidator(BookFileQuerySchema))

  const config = useRuntimeConfig(event)
  const upstreamURL = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
  upstreamURL.searchParams.set('class_id', classId)
  if (nftId) upstreamURL.searchParams.set('nft_id', nftId)
  upstreamURL.searchParams.set('index', index)
  upstreamURL.searchParams.set('custom_message', customMessage ?? '0')

  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  const rangeHeader = getHeader(event, 'range')
  if (rangeHeader) upstreamHeaders.Range = rangeHeader

  // Raw `fetch` rather than `getLikeCoinAPIFetch()`: that ofetch wrapper is for
  // typed JSON and doesn't expose the upstream Response headers/body we need to
  // stream through transparently.
  let upstream: Response
  try {
    upstream = await fetch(upstreamURL, { headers: upstreamHeaders })
  }
  catch {
    throw createError({ statusCode: 502, message: 'BOOK_FILE_FETCH_FAILED' })
  }

  if (!upstream.ok || !upstream.body) {
    const message = await upstream.text().catch(() => '')
    throw createError({
      statusCode: upstream.status || 502,
      message: message || 'BOOK_FILE_FETCH_FAILED',
    })
  }

  setResponseStatus(event, upstream.status)
  setHeader(event, 'cache-control', 'private, no-cache')
  // We forward Range and can emit 206/content-range, so the response varies on
  // Range — declare it so caches never mismatch a partial and a full body.
  setHeader(event, 'vary', 'Range')
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) setHeader(event, name, value)
  }

  // Pipe as a Node stream (not the web body): h3's web-stream sink ignores
  // `res.write()` backpressure, so a slow client could balloon server memory
  // on a 10-20MB book. The Node `.pipe()` branch honours backpressure.
  return sendStream(event, Readable.fromWeb(upstream.body as NodeWebReadableStream))
})
