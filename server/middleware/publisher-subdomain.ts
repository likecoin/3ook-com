import {
  getLocalePathPrefixes,
  getPublisherSubdomainAction,
  getPublisherSubdomainHost,
} from '~~/shared/constants/publisher-subdomain'

export default defineEventHandler((event) => {
  // No event argument: that clones the whole config and re-applies env per
  // request, and BASE_URL is fixed at deploy time on the node preset.
  const { public: { baseURL, i18n } } = useRuntimeConfig()
  if (!baseURL) return

  // Cheapest discriminator first — nearly every request is for the apex.
  // App Hosting hands the container its own Host header,
  // so the branded hostname arrives in x-forwarded-host.
  const host = getPublisherSubdomainHost(getRequestHost(event, { xForwardedHost: true }), baseURL)
  if (host.type === 'none') return

  const url = getRequestURL(event, { xForwardedHost: true })
  // 302: the whitelist can change, so no branded host may be cached as permanent.
  const redirectToApex = (path: string) => sendRedirect(event, `${baseURL}${path}${url.search}`, 302)

  // An unclaimed label owns no storefront of its own,
  // and the wildcard record must not mirror the whole app,
  // so every path goes back to the apex.
  if (host.type === 'unclaimed') return redirectToApex(url.pathname)

  // i18n.locales is typed as unknown[] in runtime config; narrowed as in the sitemap route.
  const localePrefixes = getLocalePathPrefixes({
    defaultLocale: i18n.defaultLocale,
    locales: i18n.locales as { code: string }[],
  })
  const action = getPublisherSubdomainAction(url.pathname, host.likerId, localePrefixes)
  switch (action.type) {
    case 'pass':
      return
    case 'notFound':
      throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    case 'self':
      return sendRedirect(event, `${url.origin}${action.path}${url.search}`, 302)
    case 'apex':
      return redirectToApex(action.path)
  }
})
