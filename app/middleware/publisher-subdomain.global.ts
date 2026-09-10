import { PUBLISHER_SUBDOMAIN_ROUTE_NAME } from '~~/shared/constants/publisher-subdomain'
import { STORE_PUBLISHER_ROOT_ROUTE_NAME } from '~~/shared/constants/store-routes'
import { getCanonicalLikerId } from '~~/shared/utils/liker-id'

// A publisher subdomain serves one storefront. The Nitro middleware bounces every
// other path, but client-side navigation never reaches it, so without this the
// router would render the whole app under the branded host after hydration.
export default defineNuxtRouteMiddleware((to) => {
  const host = usePublisherSubdomainHost()
  if (host.type === 'none') return

  if (host.type === 'publisher') {
    const getRouteBaseName = useRouteBaseName()
    const routeName = getRouteBaseName(to)
    // The root takes its publisher from the host, so there is no param to match.
    if (routeName === STORE_PUBLISHER_ROOT_ROUTE_NAME) return
    // The apex's own path for this storefront normalizes onto the branded root,
    // as the Nitro middleware does on a hard load.
    if (routeName === PUBLISHER_SUBDOMAIN_ROUTE_NAME
      && getCanonicalLikerId(getRouteParamString(to, 'userId')) === host.likerId) {
      const localeRoute = useLocaleRoute()
      return navigateTo(
        localeRoute({ name: STORE_PUBLISHER_ROOT_ROUTE_NAME, query: to.query }),
        { replace: true },
      )
    }
  }

  // External so the browser leaves the origin: the apex owns the session, and a
  // same-origin push would keep the user on the subdomain.
  const { public: { baseURL } } = useRuntimeConfig()
  return navigateTo(`${baseURL}${to.fullPath}`, { external: true })
})
