// Matches the app token anywhere in the UA — it may be the whole UA (older builds)
// or appended after the system WebView UA, so the real Chromium version survives.
const APP_USER_AGENT_REGEX = /3ook-com-app\/[\d.]+ ?(?:\((iOS|Android) [\d.]+\))? ?(?:Build\/(\d+))?/

function getAppUserAgent() {
  return import.meta.server
    ? useRequestHeaders(['user-agent'])['user-agent'] || ''
    : navigator.userAgent || ''
}

// The UA half of the check, for callers that run before a route settles: reading
// ?app=1 needs useRoute(), which in middleware is the route being left.
export function getIsAppUserAgent() {
  return APP_USER_AGENT_REGEX.test(getAppUserAgent())
}

export function useAppDetection() {
  const getRouteQuery = useRouteQuery()

  const userAgent = getAppUserAgent()

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
