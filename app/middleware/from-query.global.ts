import type { LocationQueryRaw } from 'vue-router'

import { sanitizeFrom, splitGluedFromQuery } from '~~/shared/utils/liker-id'

// Rewrites a malformed `from` (e.g. `@likerId?fbclid=…`) to its clean form
// before any page reads it, restoring the glued-on params as their own keys.
// Runs on the server too, so the first load lands on the fixed URL.
export default defineNuxtRouteMiddleware((to) => {
  const rawFrom = getRouteQueryString(to, 'from')
  if (!rawFrom) return
  const from = sanitizeFrom(rawFrom)
  if (from === rawFrom) return

  const query: LocationQueryRaw = { ...to.query }
  delete query.from
  for (const [key, value] of Object.entries(splitGluedFromQuery(rawFrom).gluedQuery)) {
    if (!(key in query)) query[key] = value
  }
  if (from) query.from = from
  return navigateTo({ ...to, query }, { replace: true })
})
