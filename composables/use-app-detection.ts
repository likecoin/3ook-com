const APP_USER_AGENT_PREFIX = '3ook-com-app'

export function useAppDetection() {
  const getRouteQuery = useRouteQuery()

  const isAppUserAgent = import.meta.server
    ? useRequestHeaders(['user-agent'])['user-agent']?.startsWith(APP_USER_AGENT_PREFIX) || false
    : navigator.userAgent?.startsWith(APP_USER_AGENT_PREFIX) || false

  const isApp = computed(() => {
    return isAppUserAgent || getRouteQuery('app') === '1'
  })

  return { isApp }
}
