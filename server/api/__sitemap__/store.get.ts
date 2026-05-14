import { fetchCollectiveBookNFTs } from '~~/shared/utils/collective-indexer'
import { normalizeNFTClassId } from '~~/shared/utils/index'

const SITEMAP_CLASS_IDS_CACHE_KEY = 'sitemap:store:class-ids'
const SITEMAP_CLASS_IDS_CACHE_TTL = 3600
const SITEMAP_PAGE_SIZE = 100

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
  try {
    const response = await fetchAirtableCMSProductsByTagId('latest', { pageSize: SITEMAP_PAGE_SIZE })
    return response.records.flatMap((record) => {
      if (record.classIds?.length) return record.classIds
      return record.classId ? [record.classId] : []
    })
  }
  catch (error) {
    console.error('[sitemap] Error fetching latest tag products:', error)
    return []
  }
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
    const storage = useStorage('airtable')
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
          .setItem(SITEMAP_CLASS_IDS_CACHE_KEY, classIds, { ttl: SITEMAP_CLASS_IDS_CACHE_TTL })
          .catch(err => console.error('[sitemap] failed to cache class ids:', err))
      }
    }

    setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
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
