export function useLikeCoinV3MigrationSite() {
  const { locale } = useI18n()
  const config = useRuntimeConfig()

  const getLikeCoinV3BookMigrationSiteURL = computed(() => ({ utmSource }: { utmSource?: string } = {}) => {
    const baseURL = config.public.likeCoinV3BookMigrationSiteURL
    if (!baseURL) {
      console.warn('v3BookMigrationSiteURL is not defined in public runtime config')
      return ''
    }

    const url = new URL(baseURL)
    if (locale.value === 'en') url.pathname = '/en'
    url.searchParams.set('utm_medium', '3ookcom')
    if (utmSource) url.searchParams.set('utm_source', `3ookcom_${utmSource}`)
    return url.toString()
  })

  return {
    getLikeCoinV3BookMigrationSiteURL,
  }
}
