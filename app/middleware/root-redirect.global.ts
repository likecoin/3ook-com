import { STORE_PUBLISHER_ROOT_ROUTE_NAME } from '~~/shared/constants/store-routes'

// The root is the branded storefront, which only a publisher subdomain serves.
// Anywhere else it stands in for the store — or for the shelf in the app, where
// the store is not the landing surface.
export default defineNuxtRouteMiddleware((to) => {
  const getRouteBaseName = useRouteBaseName()
  if (getRouteBaseName(to) !== STORE_PUBLISHER_ROOT_ROUTE_NAME) return
  if (usePublisherSubdomainLikerId()) return

  const isApp = getIsAppUserAgent() || getRouteQueryString(to, 'app') === '1'
  const localeRoute = useLocaleRoute()
  return navigateTo(
    localeRoute({ name: isApp ? 'shelf' : 'store', query: to.query }),
    { replace: true },
  )
})
