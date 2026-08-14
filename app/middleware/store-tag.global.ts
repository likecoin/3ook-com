// The listing tag lives in the URL path (/store/<tagId>)
// redirect the legacy ?tag= links into it
// product routes keep ?tag= as their listing-tag context
export default defineNuxtRouteMiddleware((to) => {
  if (to.query.tag === undefined) return

  const getRouteBaseNameString = useRouteBaseNameString()
  if (!getIsStoreListingTabRouteName(getRouteBaseNameString(to))) return

  const { tag: _tag, ...query } = to.query
  // NOTE: No `replace` option: the redirect inherits the original navigation's
  // push/replace type, so a pushed navigation keeps the current history entry.
  return navigateTo({
    name: to.name || undefined,
    params: { tagId: getStoreTagIdFromRoute(to) },
    query,
  }, { redirectCode: 301 })
})
