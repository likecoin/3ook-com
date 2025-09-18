export function useAnalytics() {
  const getRouteQuery = useRouteQuery()
  const { gtag } = useGtag()
  const googleAnalyticsTrackingId: string | undefined = useRuntimeConfig().public.googleAnalyticsTrackingId

  const gaClientId = ref('')
  const gaSessionId = ref('')
  const referrer = ref('')
  onMounted(() => {
    referrer.value = document.referrer
    if (gtag && googleAnalyticsTrackingId) {
      gtag('get', googleAnalyticsTrackingId, 'client_id', (clientId) => {
        gaClientId.value = clientId as string
      })
      gtag('get', googleAnalyticsTrackingId, 'session_id', (clientId) => {
        gaSessionId.value = clientId as string
      })
    }
  })

  function getAnalyticsParameters({
    utmSource,
    utmMedium,
  }: {
    utmSource?: string
    utmMedium?: string
  } = {}) {
    return {
      gaClientId: gaClientId.value,
      gaSessionId: gaSessionId.value,
      referrer: referrer.value,
      utmCampaign: getRouteQuery('utm_campaign'),
      utmMedium: getRouteQuery('utm_medium') || getRouteQuery('ll_medium') || utmMedium,
      utmSource: getRouteQuery('utm_source') || getRouteQuery('ll_source') || utmSource,
      gadClickId: getRouteQuery('gclid'),
      gadSource: getRouteQuery('gad_source'),
      fbClickId: getRouteQuery('fbclid'),
    }
  }

  return {
    gaClientId,
    gaSessionId,
    getAnalyticsParameters,
  }
}
