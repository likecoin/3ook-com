import type { LocationQueryRaw } from 'vue-router'

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

// The `navigateTo` below re-runs this middleware with the carried tags already
// on `to`, so that second pass must not clear the mark the first one set. A
// superseded redirect leaves this set, so one later navigation keeps a stale mark.
let isCarryRedirectPending = false

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
  if (hasCarriedLinkTags || !isCarryRedirectPending) {
    useCarriedLinkTags().value = { isLLMediumCarried, isLLSourceCarried }
  }
  isCarryRedirectPending = hasCarriedLinkTags

  // Leaving a publisher storefront makes that publisher the referrer, so a book
  // opened, shared, or bought from it attributes to them without every link
  // spelling out `?from=`. An explicit referrer still wins.
  const publisherLikerId = getRouteParamString(from, PUBLISHER_LIKER_ID_PARAM)
  const isEnteringPublisher = !!getRouteParamString(to, PUBLISHER_LIKER_ID_PARAM)
  if (publisherLikerId && !isEnteringPublisher && !to.query.from && !carryQuery.from) {
    carryQuery.from = formatLikerIdHandle(publisherLikerId)
  }

  if (Object.keys(carryQuery).length) {
    return navigateTo({ ...to, query: { ...to.query, ...carryQuery } })
  }
})
