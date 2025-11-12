export function useStorePageState() {
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()

  const lastScrollPosition = useState<number>('store-last-scroll-position', () => 0)
  const lastVisitedTag = useState<string>('store-last-visited-tag', () => '')
  const lastVisitedQuery = useState<Record<string, string>>('store-last-visited-query', () => ({}))

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
      name: 'store',
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
