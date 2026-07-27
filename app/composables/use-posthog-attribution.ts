// Mirrors the normalization in `useAnalytics.getAnalyticsParameters()` so
// PostHog ends up with the same normalized values the backend (Airtable) gets:
// `ll_source`/`ll_medium` collapse into `utm_source`/`utm_medium`, and
// `srsltid` becomes `utm_source=google` + `utm_medium=organic`.
// getAnalyticsParameters ALSO applies a native install-referrer fallback that
// this helper intentionally omits — install attribution reaches PostHog via the
// native SDK super properties and the backend conversion events instead.

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

// Internal in-product link tags. They still collapse into last-touch
// `utm_source`/`utm_medium` (the backend/Stripe contract depends on it), but
// must never seed `initial_utm_*`: a direct or organic visitor clicking an
// in-product upsell would lose their real acquisition source to a page name.
export const POSTHOG_LINK_TAG_KEYS = [
  'll_source',
  'll_medium',
] as const

export interface PostHogAttribution {
  lastTouch: Record<string, string>
  externalAttribution: Record<string, string>
  linkTags: Record<string, string>
}

export function usePostHogAttribution(): PostHogAttribution {
  const getRouteQuery = useRouteQuery()

  const hasSrsltid = !!getRouteQuery('srsltid')
  const externalUTMSource = getRouteQuery('utm_source') || (hasSrsltid ? 'google' : '')
  const externalUTMMedium = getRouteQuery('utm_medium') || (hasSrsltid ? 'organic' : '')

  const linkTags: Record<string, string> = {}
  for (const key of POSTHOG_LINK_TAG_KEYS) {
    const value = getRouteQuery(key)
    if (value) linkTags[key] = value
  }

  const externalAttribution: Record<string, string> = {}
  if (externalUTMSource) externalAttribution.utm_source = externalUTMSource
  if (externalUTMMedium) externalAttribution.utm_medium = externalUTMMedium
  for (const key of POSTHOG_ATTRIBUTION_KEYS) {
    if (key === 'utm_source' || key === 'utm_medium') continue
    const value = getRouteQuery(key)
    if (value) externalAttribution[key] = value
  }

  const utmSource = externalUTMSource || linkTags.ll_source
  const utmMedium = externalUTMMedium || linkTags.ll_medium
  const lastTouch: Record<string, string> = { ...externalAttribution, ...linkTags }
  if (utmSource) lastTouch.utm_source = utmSource
  if (utmMedium) lastTouch.utm_medium = utmMedium

  return { lastTouch, externalAttribution, linkTags }
}
