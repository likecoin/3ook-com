import type { NormalizedProductRecord } from '../../utils/airtable'

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseURL = config.public.baseURL
  const defaultLocale = config.public.i18n.defaultLocale
  const locales = config.public.i18n.locales as Array<{ code: string, language: string }>
  try {
    let records: NormalizedProductRecord[] = []
    let offset: string | undefined = undefined

    do {
      try {
        const response = await fetchAirtableCMSProductsByTagId(
          'latest',
          { offset },
        )

        records = records.concat(response.records)
        offset = response.offset
      }
      catch (error) {
        console.error('Error fetching products:', error)
        break
      }
    } while (offset)
    setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    return records.map(record => locales.map((locale) => {
      const localePath = locale.code === defaultLocale ? '' : `/${locale.code}`
      return {
        _sitemap: locale.language,
        loc: `${baseURL}${localePath}/store/${record.classId}`,
        alternatives: locales.filter(l => l.code !== locale.code).map((l) => {
          const lPath = l.code === defaultLocale ? '' : `/${l.code}`
          return {
            href: `${baseURL}${lPath}/store/${record.classId}`,
            hreflang: l.language,
          }
        }),
      }
    })).flat()
  }
  catch (error) {
    console.error(error)
    throw createError({
      status: 500,
      message: 'UNEXPECTED_ERROR',
    })
  }
})
