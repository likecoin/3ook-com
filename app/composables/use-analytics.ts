import { getInstallAttribution } from '~/utils/native-bridge'

// Meta's click-attribution window; install click ids older than this are dropped
// so stale clicks aren't sent to CAPI. UTM has no window (tagged instead).
const INSTALL_CLICK_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000

export function useAnalytics() {
  const getRouteQuery = useRouteQuery()
  const { proxy } = useScriptGoogleAnalytics()
  const { onLoaded: onPostHogLoaded } = useScriptPostHog()
  const googleAnalyticsTrackingId = useRuntimeConfig().public.scripts.googleAnalytics.id

  const gaClientId = ref('')
  const gaSessionId = ref('')
  const referrer = ref('')
  const posthogDistinctId = ref<string | undefined>(undefined)
  const fbp = useCookie('_fbp', { readonly: true })
  const fbc = useCookie('_fbc', { readonly: true })
  onMounted(() => {
    referrer.value = document.referrer
    if (googleAnalyticsTrackingId) {
      proxy.gtag('get', googleAnalyticsTrackingId, 'client_id', (clientId) => {
        gaClientId.value = clientId as string
      })
      proxy.gtag('get', googleAnalyticsTrackingId, 'session_id', (sessionId) => {
        gaSessionId.value = sessionId as string
      })
    }
    onPostHogLoaded(({ posthog }) => {
      posthogDistinctId.value = posthog.get_distinct_id?.() || undefined
    })
  })

  function getAnalyticsParameters({
    utmSource,
    utmMedium,
  }: {
    utmSource?: string
    utmMedium?: string
  } = {}) {
    let resolvedUtmSource = getRouteQuery('utm_source')
    let resolvedUtmMedium = getRouteQuery('utm_medium')
    if (getRouteQuery('srsltid')) {
      if (!resolvedUtmSource) {
        resolvedUtmSource = 'google'
      }
      if (!resolvedUtmMedium) {
        resolvedUtmMedium = 'organic'
      }
    }

    // Fall back to the install referrer only when the live session has no value,
    // so last-touch always wins. Click ids (`gated`) are additionally limited to
    // the freshness window. Any fill is flagged via `attributionSource` so it is
    // never confused with live last-touch attribution downstream.
    const install = getInstallAttribution()
    const now = Date.now()
    // Reject future timestamps (clock skew / malformed payload) — a negative
    // difference would otherwise satisfy the window check and look "fresh".
    const installFresh = !!install
      && install.installedAt <= now
      && now - install.installedAt < INSTALL_CLICK_FRESHNESS_MS
    let usedInstall = false
    const withInstall = (live: string | undefined, key: string, gated = false): string | undefined => {
      if (live) return live
      if (!install || (gated && !installFresh)) return live
      const value = install.attribution[key]
      if (!value) return live
      usedInstall = true
      return value
    }

    // Resolve every field before the return so `usedInstall` is fully
    // accumulated, keeping `attributionSource` independent of property order.
    const utmCampaign = withInstall(getRouteQuery('utm_campaign'), 'utm_campaign')
    const utmMediumResolved = withInstall(resolvedUtmMedium || getRouteQuery('ll_medium') || utmMedium, 'utm_medium')
    const utmSourceResolved = withInstall(resolvedUtmSource || getRouteQuery('ll_source') || utmSource, 'utm_source')
    const utmContent = withInstall(getRouteQuery('utm_content'), 'utm_content')
    const utmTerm = withInstall(getRouteQuery('utm_term'), 'utm_term')
    const gadClickId = withInstall(getRouteQuery('gclid'), 'gclid', true)
    const gadSource = withInstall(getRouteQuery('gad_source'), 'gad_source', true)
    const fbClickId = withInstall(getRouteQuery('fbclid'), 'fbclid', true)

    return {
      gaClientId: gaClientId.value,
      gaSessionId: gaSessionId.value,
      referrer: referrer.value,
      utmCampaign,
      utmMedium: utmMediumResolved,
      utmSource: utmSourceResolved,
      utmContent,
      utmTerm,
      gadClickId,
      gadSource,
      fbClickId,
      fbp: fbp.value || undefined,
      fbc: fbc.value || undefined,
      posthogDistinctId: posthogDistinctId.value,
      attributionSource: usedInstall ? 'install_referrer' : undefined,
    }
  }

  return {
    gaClientId,
    gaSessionId,
    getAnalyticsParameters,
  }
}
