export function useNoCache() {
  const getRouteQuery = useRouteQuery()
  const isCacheDisabled = computed(() => getRouteQuery('nocache') === '1')
  return isCacheDisabled
}
