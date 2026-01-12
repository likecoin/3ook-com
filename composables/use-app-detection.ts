export function useAppDetection() {
  const getRouteQuery = useRouteQuery()

  const isApp = computed(() => {
    let isAppUserAgent = false
    if (import.meta.client) {
      isAppUserAgent = navigator.userAgent?.startsWith('3ook-com-app') || false
    }
    return isAppUserAgent || getRouteQuery('app') === '1'
  })

  return {
    isApp: readonly(isApp),
  }
}
