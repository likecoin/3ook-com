// e.g. "3ook-com-app/1.1.0 (iOS 18.0) Build/42"
const APP_USER_AGENT_REGEX = /^3ook-com-app\/[\d.]+ \((iOS|Android) [\d.]+\)/

export function useAppDetection() {
  const getRouteQuery = useRouteQuery()

  const userAgent = import.meta.server
    ? useRequestHeaders(['user-agent'])['user-agent'] || ''
    : navigator.userAgent || ''

  const appUAMatches = userAgent.match(APP_USER_AGENT_REGEX)
  const appOSName = appUAMatches?.[1]

  const isApp = computed(() => {
    return !!appUAMatches || getRouteQuery('app') === '1'
  })

  const isIOS = computed(() => appOSName === 'iOS' || /iPhone|iPad/.test(userAgent))
  const isAndroid = computed(() => appOSName === 'Android' || /Android/.test(userAgent))

  return {
    isApp,
    isIOS,
    isAndroid,
  }
}
