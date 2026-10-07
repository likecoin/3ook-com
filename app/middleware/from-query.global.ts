import type { LocationQueryRaw } from 'vue-router'

import { parseFromQuery } from '~~/shared/utils/liker-id'

// Rewrites a malformed `from` (e.g. `@likerId?fbclid=…`) to its clean form
// before any page reads it, restoring the glued-on params as their own keys.
// Runs on the server too, so the first load lands on the fixed URL.
export default defineNuxtRouteMiddleware((to) => {
  const rawFrom = getRouteQueryString(to, 'from')
  if (!rawFrom) return
  const { from, gluedQuery } = parseFromQuery(rawFrom)
  if (from === rawFrom) return

  const query: LocationQueryRaw = { ...gluedQuery, ...to.query }
  delete query.from
  if (from) query.from = from
  return navigateTo({ ...to, query }, { replace: true })
})
