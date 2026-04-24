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

    return {
      gaClientId: gaClientId.value,
      gaSessionId: gaSessionId.value,
      referrer: referrer.value,
      utmCampaign: getRouteQuery('utm_campaign'),
      utmMedium: resolvedUtmMedium || getRouteQuery('ll_medium') || utmMedium,
      utmSource: resolvedUtmSource || getRouteQuery('ll_source') || utmSource,
      utmContent: getRouteQuery('utm_content'),
      utmTerm: getRouteQuery('utm_term'),
      gadClickId: getRouteQuery('gclid'),
      gadSource: getRouteQuery('gad_source'),
      fbClickId: getRouteQuery('fbclid'),
      fbp: fbp.value || undefined,
      fbc: fbc.value || undefined,
      posthogDistinctId: posthogDistinctId.value,
    }
  }

  return {
    gaClientId,
    gaSessionId,
    getAnalyticsParameters,
  }
}
