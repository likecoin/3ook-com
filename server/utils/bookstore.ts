import type { H3Event } from 'h3'
import { FetchError } from 'ofetch'
import { getLikeCoinAPIFetch } from '~~/shared/utils/api'
import { MAX_BOOKSTORE_PAGE_SIZE, type BookstoreBuiltInListType } from '~~/shared/utils/bookstore'

export const BOOKSTORE_API_BASE_PATH = '/likernft/book/store'

export const BUILT_IN_LIST_PATHS: Record<BookstoreBuiltInListType, string> = {
  'latest': `${BOOKSTORE_API_BASE_PATH}/list`,
  'free': `${BOOKSTORE_API_BASE_PATH}/list/free`,
  'drm-free': `${BOOKSTORE_API_BASE_PATH}/list/drm-free`,
}

interface NFTBookPrice {
  price?: number
  priceInDecimalByCurrency?: BookPriceInDecimalByCurrency
  isUnlisted?: boolean
}

interface NFTBookListingInfo {
  id?: string
  classId?: string
  name?: string
  thumbnailUrl?: string
  inLanguage?: string
  isAdultOnly?: boolean
  hideDownload?: boolean
  timestamp?: number
  prices?: NFTBookPrice[]
  // Denormalized cheapest listed price (in major units, i.e. priceInDecimal/100).
  // Falls back to scanning `prices` when absent (e.g. docs predating backfill).
  minPrice?: number
}

interface NFTBookCMSTagsResponse {
  list: Array<Parameters<typeof normalizeCMSTag>[0]>
}

interface NFTBookListResponse {
  list: NFTBookListingInfo[]
  // /cms/list paginates by numeric offset; /list* by timestamp cursor.
  nextOffset?: number | null
  nextKey?: number | null
}

function normalizeCMSTag(tag: {
  id: string
  name?: { zh?: string, en?: string }
  description?: { zh?: string, en?: string }
  isPublic?: boolean
  order?: string
}): BookstoreCMSTag {
  return {
    id: tag.id,
    name: { zh: tag.name?.zh || '', en: tag.name?.en || '' },
    description: { zh: tag.description?.zh || '', en: tag.description?.en || '' },
    isPublic: !!tag.isPublic,
  }
}

function getCheapestListedPrice(prices: NFTBookPrice[] = []) {
  return prices
    .filter(p => !p.isUnlisted && typeof p.price === 'number')
    .reduce<NFTBookPrice | undefined>(
      (min, p) => (min === undefined || (p.price as number) < (min.price as number) ? p : min),
      undefined,
    )
}

function normalizeBookListingToProduct(book: NFTBookListingInfo): BookstoreCMSProduct {
  const cheapest = getCheapestListedPrice(book.prices)
  return {
    id: book.classId || book.id || '',
    classId: book.classId,
    title: book.name,
    imageUrl: book.thumbnailUrl,
    locales: book.inLanguage ? [book.inLanguage] : undefined,
    isDRMFree: book.hideDownload === false,
    isAdultOnly: book.isAdultOnly || undefined,
    minPrice: book.minPrice ?? cheapest?.price,
    minPriceInDecimalByCurrency: cheapest?.priceInDecimalByCurrency,
    timestamp: book.timestamp,
  }
}

export async function fetchBookstoreCMSTagsForAll(): Promise<FetchBookstoreCMSTagsResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const { list } = await fetch<NFTBookCMSTagsResponse>(`${BOOKSTORE_API_BASE_PATH}/cms/tags`)
  return { records: (list || []).map(normalizeCMSTag) }
}

export async function fetchBookstoreCMSTagById(tagId: string): Promise<BookstoreCMSTag | undefined> {
  const fetch = getLikeCoinAPIFetch()
  try {
    const tag = await fetch<Parameters<typeof normalizeCMSTag>[0]>(
      `${BOOKSTORE_API_BASE_PATH}/cms/tags/${encodeURIComponent(tagId)}`,
    )
    return normalizeCMSTag(tag)
  }
  catch (error) {
    if (error instanceof FetchError && error.statusCode === 404) return undefined
    throw error
  }
}

export async function fetchBookstoreCMSProductsByTagId(
  tagId: string,
  { pageSize = MAX_BOOKSTORE_PAGE_SIZE, nextKey: offset }: { pageSize?: number, nextKey?: string } = {},
): Promise<FetchBookstoreCMSProductsResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const { list, nextOffset } = await fetch<NFTBookListResponse>(`${BOOKSTORE_API_BASE_PATH}/cms/list`, {
    query: { tag: tagId, limit: pageSize, offset: offset ? Number(offset) : undefined },
  })
  return {
    records: (list || []).map(normalizeBookListingToProduct),
    offset: typeof nextOffset === 'number' ? String(nextOffset) : undefined,
    hasMore: typeof nextOffset === 'number',
  }
}

export async function fetchBookstoreBookListing(
  path: string,
  { pageSize = MAX_BOOKSTORE_PAGE_SIZE, nextKey: key }: { pageSize?: number, nextKey?: string } = {},
): Promise<FetchBookstoreCMSProductsResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const { list, nextKey } = await fetch<NFTBookListResponse>(path, {
    query: { limit: pageSize, key: key ? Number(key) : undefined },
  })
  return {
    records: (list || []).map(normalizeBookListingToProduct),
    offset: typeof nextKey === 'number' ? String(nextKey) : undefined,
    hasMore: typeof nextKey === 'number',
  }
}

export async function respondWithBookstoreAPI(
  event: H3Event,
  fetcher: (opts: { pageSize: number, nextKey?: string }) => Promise<FetchBookstoreCMSProductsResponseData>,
  {
    notFoundStatusCode = 404,
    notFoundStatusMessage = 'NOT_FOUND',
  }: {
    notFoundStatusCode?: number
    notFoundStatusMessage?: string
  } = {},
) {
  const query = getQuery(event)
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const offsetRaw = Array.isArray(query.offset) ? query.offset[0] : query.offset
  // Parse first, then clamp; an invalid/missing/empty limit falls back to the max,
  // while `limit=0` clamps to 1 (not the max — `0 || max` would have swallowed it).
  // `limit=` alone is treated as missing so it doesn't slip through as Number('')=0.
  const limitNum = limitRaw === undefined || limitRaw === '' ? NaN : Number(limitRaw)
  const pageSize = Number.isFinite(limitNum)
    ? Math.min(Math.max(1, Math.floor(limitNum)), MAX_BOOKSTORE_PAGE_SIZE)
    : MAX_BOOKSTORE_PAGE_SIZE
  // Validate offset as a non-negative integer; treat 0 the same as omitted so page-1 stays cacheable.
  let nextKey: string | undefined
  if (offsetRaw !== undefined && offsetRaw !== '') {
    const offsetNum = Number(offsetRaw)
    if (!Number.isInteger(offsetNum) || offsetNum < 0) {
      throw createError({ statusCode: 400, statusMessage: 'INVALID_OFFSET' })
    }
    nextKey = offsetNum === 0 ? undefined : String(offsetNum)
  }
  try {
    const result = await fetcher({ pageSize, nextKey })
    setHeader(event, 'cache-control', 'public, max-age=60')
    return result
  }
  catch (error) {
    if (error instanceof FetchError && error.statusCode === 404) {
      throw createError({ statusCode: notFoundStatusCode, statusMessage: notFoundStatusMessage })
    }
    console.error(error)
    throw createError({ statusCode: 500, statusMessage: 'UNEXPECTED_ERROR' })
  }
}
