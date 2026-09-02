import type { LocationQueryRaw, RouteLocationNormalized } from 'vue-router'

import { STORE_PUBLISHER_ROOT_ROUTE_NAME } from '~~/shared/constants/store-routes'
import { formatLikerIdHandle } from '~~/shared/utils/liker-id'

const CARRY_ON_QUERY_KEYS = [
  // Sorted by alphabetical order
  'app',
  'fbclid',
  'from',
  'gad_source',
  'gclid',
  'll_medium',
  'll_source',
  'maintenance',
  'srsltid',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]

const LINK_TAG_QUERY_KEYS = ['ll_medium', 'll_source'] as const

// The `navigateTo` below re-runs this middleware with the carried tags already
// on `to`, so that second pass must not clear the mark the first one set. Keyed
// on the state that redirect lands in, so a superseded one matches nothing.
let pendingCarryRedirectKey: string | undefined

function getCarryRedirectKey(path: string, query: LocationQueryRaw) {
  return [path, ...LINK_TAG_QUERY_KEYS.map(key => query[key] ?? '')].join('\n')
}

// `userId` is only ever bound by the publisher storefront routes
// (/store/@<likerId> and its library twin).
const PUBLISHER_LIKER_ID_PARAM = 'userId'

export default defineNuxtRouteMiddleware((to, from) => {
  // NOTE: This middleware is used to carry on query parameters from the previous route to the next route.
  // In server-side, to and from are always the same, so we don't need to carry on query parameters.
  if (import.meta.server) return

  const carryQuery: LocationQueryRaw = {}
  for (const key of CARRY_ON_QUERY_KEYS) {
    if (from.query[key] && !to.query[key]) {
      carryQuery[key] = from.query[key]
    }
  }

  // `useEntryLinkTagProperties()` names the surface an event came from off the
  // route, so it has to know which tags this navigation merely inherited.
  const isLLMediumCarried = !!carryQuery.ll_medium
  const isLLSourceCarried = !!carryQuery.ll_source
  const hasCarriedLinkTags = isLLMediumCarried || isLLSourceCarried
  // Consumed on read: a redirect that never lands can only ever shadow the one
  // navigation that follows it.
  const isCarryRedirectPass = pendingCarryRedirectKey === getCarryRedirectKey(to.path, to.query)
  pendingCarryRedirectKey = undefined
  if (hasCarriedLinkTags || !isCarryRedirectPass) {
    useCarriedLinkTags().value = { isLLMediumCarried, isLLSourceCarried }
  }

  // Leaving a publisher storefront makes that publisher the referrer, so a book
  // opened, shared, or bought from it attributes to them without every link
  // spelling out `?from=`. An explicit referrer still wins.

  // The branded root names its publisher through the host, not the path.
  const getRouteBaseName = useRouteBaseName()
  const getPublisherLikerId = (route: RouteLocationNormalized) => {
    const paramLikerId = getRouteParamString(route, PUBLISHER_LIKER_ID_PARAM)
    if (paramLikerId) return paramLikerId
    if (getRouteBaseName(route) !== STORE_PUBLISHER_ROOT_ROUTE_NAME) return ''
    return usePublisherSubdomainLikerId()
  }

  const publisherLikerId = getPublisherLikerId(from)
  const isEnteringPublisher = !!getPublisherLikerId(to)
  if (publisherLikerId && !isEnteringPublisher && !to.query.from && !carryQuery.from) {
    carryQuery.from = formatLikerIdHandle(publisherLikerId)
  }

  if (Object.keys(carryQuery).length) {
    const query = { ...to.query, ...carryQuery }
    // Only a carried tag leaves a mark for the redirect pass to protect, so a
    // redirect carrying anything else must not shadow the navigation after it.
    if (hasCarriedLinkTags) {
      pendingCarryRedirectKey = getCarryRedirectKey(to.path, query)
    }
    return navigateTo({ ...to, query })
  }
})
