export function useStorePageState(routeName: MaybeRefOrGetter<string> = 'store') {
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()

  // /store and /library reuse this composable; namespace state per route so
  // their scroll/tag memory doesn't clobber each other. The route name is fixed
  // for a mounted page instance, so resolve the key prefix once.
  const name = toValue(routeName) || 'store'

  const lastScrollPosition = useState<number>(`${name}-last-scroll-position`, () => 0)
  const lastVisitedTag = useState<string>(`${name}-last-visited-tag`, () => '')
  const lastVisitedQuery = useState<Record<string, string>>(`${name}-last-visited-query`, () => ({}))

  function save(tag: string, query: Record<string, string>) {
    if (import.meta.client) {
      lastScrollPosition.value = window.scrollY || document.documentElement.scrollTop
    }
    lastVisitedTag.value = tag
    lastVisitedQuery.value = { ...query }
  }

  function restoreScroll() {
    if (import.meta.client && lastScrollPosition.value > 0) {
      window.scrollTo({
        top: lastScrollPosition.value,
      })
    }
  }

  function clear() {
    lastScrollPosition.value = 0
    lastVisitedTag.value = ''
    lastVisitedQuery.value = {}
    if (import.meta.client) {
      window.scrollTo({
        top: 0,
      })
    }
  }

  async function restoreIfNeeded() {
    if (!lastVisitedTag.value) {
      return
    }
    await navigateTo(localeRoute({
      name,
      query: {
        ...lastVisitedQuery.value,
        tag: lastVisitedTag.value === 'default' ? undefined : lastVisitedTag.value,
      },
    }), { replace: true })
    return
  }

  function restoreScrollIfNeeded() {
    const currentTag = getRouteQuery('tag', '')
    const savedTag = lastVisitedTag.value

    if (currentTag === savedTag && lastScrollPosition.value > 0) {
      restoreScroll()
    }
  }

  return {
    save,
    restoreScroll,
    clear,
    restoreIfNeeded,
    restoreScrollIfNeeded,
  }
}
