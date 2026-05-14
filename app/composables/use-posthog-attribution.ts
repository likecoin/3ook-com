// Mirrors the fallback logic in `useAnalytics.getAnalyticsParameters()` so
// PostHog ends up with the same normalized values the backend (Airtable) gets:
// `ll_source`/`ll_medium` collapse into `utm_source`/`utm_medium`, and
// `srsltid` becomes `utm_source=google` + `utm_medium=organic`.

export const POSTHOG_ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gad_source',
  'fbclid',
] as const

export function usePostHogAttribution(): Record<string, string> {
  const getRouteQuery = useRouteQuery()

  const hasSrsltid = !!getRouteQuery('srsltid')
  const utmSource = getRouteQuery('utm_source') || (hasSrsltid ? 'google' : '') || getRouteQuery('ll_source')
  const utmMedium = getRouteQuery('utm_medium') || (hasSrsltid ? 'organic' : '') || getRouteQuery('ll_medium')

  const attribution: Record<string, string> = {}
  if (utmSource) attribution.utm_source = utmSource
  if (utmMedium) attribution.utm_medium = utmMedium
  for (const key of POSTHOG_ATTRIBUTION_KEYS) {
    if (key === 'utm_source' || key === 'utm_medium') continue
    const value = getRouteQuery(key)
    if (value) attribution[key] = value
  }
  return attribution
}
