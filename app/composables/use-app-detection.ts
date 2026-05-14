// e.g. "3ook-com-app/1.0.0", "3ook-com-app/1.1.0 (iOS 18.0) Build/42"
const APP_USER_AGENT_REGEX = /^3ook-com-app\/[\d.]+ ?(?:\((iOS|Android) [\d.]+\))? ?(?:Build\/(\d+))?/

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
  const buildVersion = computed(() => {
    const buildVersionStr = appUAMatches?.[2]
    return buildVersionStr ? parseInt(buildVersionStr, 10) : undefined
  })

  const isNativeBridge = computed(() => isApp.value && isNativeWebView())

  const appPlatform = computed<'ios' | 'android' | 'web'>(() => {
    if (!isNativeBridge.value) return 'web'
    if (isIOS.value) return 'ios'
    if (isAndroid.value) return 'android'
    return 'web'
  })

  return {
    isApp,
    isIOS,
    isAndroid,
    buildVersion,
    isNativeBridge,
    appPlatform,
  }
}
