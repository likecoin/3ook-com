import type { LocationQueryRaw } from 'vue-router'

const CARRY_ON_QUERY_KEYS = [
  'from',
  'll_medium',
  'll_source',
  'utm_campaign',
  'utm_medium',
  'utm_source',
  'utm_content',
  'utm_term',
  'maintenance',
]

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

  if (Object.keys(carryQuery).length) {
    return navigateTo({ ...to, query: { ...to.query, ...carryQuery } })
  }
})
