const AIRTABLE_RECORDS_TTL = 86400 // 1 day
const AIRTABLE_OFFSET_TTL = 120 // 2 minutes (Airtable offsets expire ~5 min)

/**
 * Dual-TTL cache for Airtable paginated responses.
 * Records are cached with a long TTL; offset cursor and hasMore flag are cached separately.
 * When offset expires, cached records are still served with hasMore to signal the client
 * should refresh page 1 for a new cursor.
 */
export async function fetchWithAirtableCache<T>(
  cacheKey: string,
  fetcher: () => Promise<{ records: T[], offset?: string }>,
): Promise<{ records: T[], offset?: string, hasMore: boolean }> {
  const storage = useStorage('airtable')
  const recordsKey = `${cacheKey}:records`
  const offsetKey = `${cacheKey}:offset`
  const hasMoreKey = `${cacheKey}:hasMore`

  const [cachedRecords, cachedOffset, cachedHasMore] = await Promise.all([
    storage.getItem<T[]>(recordsKey),
    storage.getItem<string>(offsetKey),
    storage.getItem<boolean>(hasMoreKey),
  ])

  if (cachedRecords) {
    return {
      records: cachedRecords,
      offset: cachedOffset ?? undefined,
      hasMore: cachedHasMore ?? !!cachedOffset,
    }
  }

  const result = await fetcher()
  const hasMore = !!result.offset

  // Fire-and-forget cache writes
  const logCacheError = (key: string) => (err: unknown) => console.error(`[airtable-cache] failed to write ${key}:`, err)
  storage.setItem(recordsKey, result.records, { ttl: AIRTABLE_RECORDS_TTL }).catch(logCacheError(recordsKey))
  storage.setItem(hasMoreKey, hasMore, { ttl: AIRTABLE_RECORDS_TTL }).catch(logCacheError(hasMoreKey))
  if (result.offset) {
    storage.setItem(offsetKey, result.offset, { ttl: AIRTABLE_OFFSET_TTL }).catch(logCacheError(offsetKey))
  }

  return { ...result, hasMore }
}

export function getAirtableCMSFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({
    baseURL: `https://api.airtable.com/v0/${config.public.airtableCMSBaseId}`,
    headers: {
      Authorization: `Bearer ${config.airtableAPISecret}`,
    },
  })
}

export interface FetchAirtableCMSProductsByTagIdResponseData {
  records: Array<{
    id: string
    createdTime: string
    fields: {
      'Key'?: string
      'Publications'?: string[]
      'Liker Land URL'?: string[]
      'Image'?: Array<{
        id: string
        width: number
        height: number
        url: string
        filename: string
        size: number
        type: string
        thumbnails?: {
          small?: {
            url: string
            width: number
            height: number
          }
          large?: {
            url: string
            width: number
            height: number
          }
          full?: {
            url: string
            width: number
            height: number
          }
        }
      }>
      'Names'?: string[]
      'Locales'?: string[]
      'IDs'?: string[]
      'Image URLs'?: string[]
      'Publication Count'?: number
      'ID'?: string
      'Image URL'?: string
      'Name'?: string
      'Min Price'?: number
      'Min Price HKD'?: number
      'Min Price TWD'?: number
      'Listing Date'?: string[]
      'Timestamp'?: number
      'DRM-free'?: boolean | number // boolean in Publications table, number (0 = false, 1 = true) in Products table
      'Sales Count'?: number
      'Chain'?: string[]
      'Calculation'?: boolean
      'Adult Only'?: boolean
      'In Library'?: boolean
    }
  }>
  offset?: string
}

const SEARCH_FIELDS = [
  'Name',
  'Description',
  'Owner Name',
  'Author',
  'Publisher',
  'Keywords Text',
  'Genre',
]

function getFormulaForSearchTerm(searchTerm: string) {
  const formattedQueryString = searchTerm.replaceAll('"', '').toLowerCase()
  const formulas = SEARCH_FIELDS.map(
    field => `IF(SEARCH(LOWER("${formattedQueryString}"), LOWER({${field}})), 1)`,
  )
  const formula = `OR(${formulas.join(', ')})`
  return formula
}

function getScopedSearchFormula(formula: string, isLibrary = false) {
  return isLibrary ? `AND({In Library}, ${formula})` : formula
}

// Airtable stores per-currency "Min Price <CODE>" columns in major units
// (e.g. HKD/TWD dollars). Convert to the minor-unit override shape the client
// price resolver expects.
function normalizeMinPriceInDecimalByCurrency(
  fields: FetchAirtableCMSProductsByTagIdResponseData['records'][number]['fields'],
): BookPriceInDecimalByCurrency | undefined {
  const result: BookPriceInDecimalByCurrency = {}
  const hkd = fields['Min Price HKD']
  const twd = fields['Min Price TWD']
  if (typeof hkd === 'number' && hkd > 0) result.hkd = Math.round(hkd * 100)
  if (typeof twd === 'number' && twd > 0) result.twd = Math.round(twd * 100)
  return Object.keys(result).length ? result : undefined
}

function normalizeProductRecord({ id, fields }: FetchAirtableCMSProductsByTagIdResponseData['records'][number]): BookstoreCMSProduct {
  const classIds = fields.IDs
  const isMultiple = classIds && classIds.length > 1
  return {
    id,
    classId: fields.ID,
    classIds: isMultiple ? classIds : undefined,
    title: fields.Name,
    titles: isMultiple ? fields.Names : undefined,
    imageUrl: fields['Image URL'],
    imageUrls: isMultiple ? fields['Image URLs'] : undefined,
    locales: fields.Locales,
    isDRMFree: !!fields['DRM-free'],
    isAdultOnly: !!fields['Adult Only'] || undefined,
    isPlusReadingEnabled: !!fields['In Library'],
    isMultiple: isMultiple ? true : undefined,
    minPrice: fields['Min Price'],
    minPriceInDecimalByCurrency: normalizeMinPriceInDecimalByCurrency(fields),
    timestamp: fields.Timestamp,
  }
}

interface FetchAirtableCMSPublicationsOptions {
  pageSize?: number
  offset?: string
  isLibrary?: boolean
}

export async function fetchAirtableCMSPublicationsBySearchTerm(
  searchTerm: string,
  {
    pageSize = 100,
    offset,
    isLibrary = false,
  }: FetchAirtableCMSPublicationsOptions = {},
): Promise<FetchBookstoreCMSProductsResponseData> {
  const config = useRuntimeConfig()
  const fetch = getAirtableCMSFetch()
  const filterByFormula = getScopedSearchFormula(getFormulaForSearchTerm(searchTerm), isLibrary)
  const results = await fetch<FetchAirtableCMSProductsByTagIdResponseData>(
    `/${config.public.airtableCMSPublicationsTableId}`,
    {
      params: {
        view: 'search',
        pageSize,
        filterByFormula,
        offset,
      },
    },
  )

  const normalizedRecords = results.records.map(normalizeProductRecord)

  return {
    records: normalizedRecords,
    offset: results.offset,
  }
}

export function sanitizeAirtableGenre(genre: string): string {
  return genre.replaceAll('"', '')
}

export async function fetchAirtableCMSPublicationsByGenre(
  genre: string,
  {
    pageSize = 100,
    offset,
    isLibrary = false,
  }: FetchAirtableCMSPublicationsOptions = {},
): Promise<FetchBookstoreCMSProductsResponseData> {
  const config = useRuntimeConfig()
  const fetch = getAirtableCMSFetch()
  const filterByFormula = getScopedSearchFormula(`{Genre}="${sanitizeAirtableGenre(genre)}"`, isLibrary)
  const results = await fetch<FetchAirtableCMSProductsByTagIdResponseData>(
    `/${config.public.airtableCMSPublicationsTableId}`,
    {
      params: {
        view: 'search',
        pageSize,
        filterByFormula,
        offset,
      },
    },
  )

  const normalizedRecords = results.records.map(normalizeProductRecord)

  return {
    records: normalizedRecords,
    offset: results.offset,
  }
}
