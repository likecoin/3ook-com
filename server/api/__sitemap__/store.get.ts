import { SITEMAP_STORAGE_BASE } from '~~/shared/constants/server-cache'
import { fetchCollectiveBookNFTs } from '~~/shared/utils/collective-indexer'
import { normalizeNFTClassId } from '~~/shared/utils/index'

const SITEMAP_CLASS_IDS_CACHE_KEY = 'sitemap:store:class-ids'
const SITEMAP_PAGE_SIZE = 100
// Bound the latest-books walk by page count (~2000 books at SITEMAP_PAGE_SIZE).
// A sitemap doesn't need the entire long tail, and this caps upstream work per cache miss.
// Bounding by pages (not accumulated ids) guarantees termination even if a page
// returns records that all lack a classId.
const SITEMAP_LATEST_MAX_PAGES = 20

let inflightClassIds: Promise<string[]> | null = null

async function fetchTopStakedClassIds(): Promise<string[]> {
  try {
    const response = await fetchCollectiveBookNFTs({
      'sort_by': 'staked_amount',
      'sort_order': 'desc',
      'pagination.limit': SITEMAP_PAGE_SIZE,
    })
    return response.data.map(item => item.evm_address).filter(Boolean)
  }
  catch (error) {
    console.error('[sitemap] Error fetching top-staked books:', error)
    return []
  }
}

async function fetchLatestTagClassIds(): Promise<string[]> {
  const classIds: string[] = []
  let nextKey: string | undefined
  try {
    for (let page = 0; page < SITEMAP_LATEST_MAX_PAGES; page += 1) {
      const response = await fetchBookstoreBookListing(BUILT_IN_LIST_PATHS.latest, { pageSize: SITEMAP_PAGE_SIZE, nextKey })
      classIds.push(...response.records.flatMap(record => (record.classId ? [record.classId] : [])))
      // Stop on the last page, an empty page, or a cursor that didn't advance.
      if (!response.hasMore || !response.records.length || response.offset === nextKey) break
      nextKey = response.offset
    }
  }
  catch (error) {
    // Return whatever pages succeeded; partial coverage beats dropping the latest set entirely.
    console.error('[sitemap] Error fetching latest books:', error)
  }
  return classIds
}

async function collectStoreClassIds(): Promise<string[]> {
  const [staked, latest] = await Promise.all([
    fetchTopStakedClassIds(),
    fetchLatestTagClassIds(),
  ])
  return Array.from(new Set([...staked, ...latest].map(normalizeNFTClassId).filter(Boolean)))
}

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseURL = config.public.baseURL
  const defaultLocale = config.public.i18n.defaultLocale
  const locales = config.public.i18n.locales as Array<{ code: string, language: string }>
  try {
    const storage = useStorage(SITEMAP_STORAGE_BASE)
    let classIds = await storage.getItem<string[]>(SITEMAP_CLASS_IDS_CACHE_KEY)
    if (!classIds) {
      // Coalesce concurrent cache-miss requests into a single upstream fetch
      inflightClassIds ??= collectStoreClassIds().finally(() => {
        inflightClassIds = null
      })
      classIds = await inflightClassIds
      // Don't cache empty results — a transient upstream outage shouldn't poison the sitemap for an hour
      if (classIds.length > 0) {
        storage
          .setItem(SITEMAP_CLASS_IDS_CACHE_KEY, classIds)
          .catch(err => console.error('[sitemap] failed to cache class ids:', err))
      }
    }

    setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400, stale-if-error=86400')
    return classIds.flatMap(classId => locales.map((locale) => {
      const localePath = locale.code === defaultLocale ? '' : `/${locale.code}`
      return {
        _sitemap: locale.language,
        loc: `${baseURL}${localePath}/store/${classId}`,
        alternatives: locales.filter(l => l.code !== locale.code).map((l) => {
          const lPath = l.code === defaultLocale ? '' : `/${l.code}`
          return {
            href: `${baseURL}${lPath}/store/${classId}`,
            hreflang: l.language,
          }
        }),
      }
    }))
  }
  catch (error) {
    console.error(error)
    throw createError({
      status: 500,
      message: 'UNEXPECTED_ERROR',
    })
  }
})
