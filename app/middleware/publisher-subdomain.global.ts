import { PUBLISHER_SUBDOMAIN_ROUTE_NAME, getPublisherSubdomainHost } from '~~/shared/constants/publisher-subdomain'
import { getCanonicalLikerId } from '~~/shared/utils/liker-id'

// A publisher subdomain serves exactly one page. The Nitro middleware bounces
// every other path, but client-side navigation never reaches it, so without this
// the router would render the whole app under the branded host after hydration.
export default defineNuxtRouteMiddleware((to) => {
  const { public: { baseURL } } = useRuntimeConfig()
  if (!baseURL) return

  // xForwardedHost for the SSR pass, where Host is App Hosting's own;
  // on the client the URL comes from window.location either way.
  const host = getPublisherSubdomainHost(useRequestURL({ xForwardedHost: true }).host, baseURL)
  if (host.type === 'none') return

  if (host.type === 'publisher') {
    const getRouteBaseNameString = useRouteBaseNameString()
    const isOwnStorefront = getRouteBaseNameString(to) === PUBLISHER_SUBDOMAIN_ROUTE_NAME
      && getCanonicalLikerId(getRouteParamString(to, 'userId')) === host.likerId
    if (isOwnStorefront) return
  }

  // External so the browser leaves the origin: the apex owns the session, and a
  // same-origin push would keep the user on the subdomain.
  return navigateTo(`${baseURL}${to.fullPath}`, { external: true })
})
