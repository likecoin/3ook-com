import { APP_STORE_URL, GOOGLE_PLAY_URL } from '~/utils/app-store'

// Builds App Store / Google Play download links that carry install attribution.
// Live UTM (from usePostHogAttribution) wins; a static per-CTA `placement` tag
// is the fallback so organic clicks are still attributed to where they came
// from. Google Play reads the encoded `referrer` via the Install Referrer API;
// Apple campaign tokens (pt/ct) surface in App Store Connect App Analytics only.

export const APP_DOWNLOAD_PLACEMENTS = [
  'footer',
  'about',
  'app_page_hero',
  'app_page_cta',
  'app_download',
] as const
export type AppDownloadPlacement = (typeof APP_DOWNLOAD_PLACEMENTS)[number]

const STATIC_SOURCE = '3ookcom'
const STATIC_MEDIUM = 'app_download'

// Apple App Store Connect provider token (pt); fill in when available,
// otherwise the campaign link omits it and relies on ct alone.
const APP_STORE_PROVIDER_TOKEN = ''

export function useAppDownloadUrls(placement: AppDownloadPlacement) {
  const attribution = usePostHogAttribution()

  const params: Record<string, string> = {
    utm_source: attribution.utm_source || STATIC_SOURCE,
    utm_medium: attribution.utm_medium || STATIC_MEDIUM,
    utm_campaign: attribution.utm_campaign || placement,
  }
  // Carry through finer-grained attribution when the session has it.
  for (const key of ['utm_content', 'utm_term', 'gclid', 'gad_source', 'fbclid'] as const) {
    if (attribution[key]) params[key] = attribution[key]
  }

  // Play wants the whole UTM string as one URL-encoded `referrer` value.
  const referrer = encodeURIComponent(new URLSearchParams(params).toString())
  const googlePlayUrl = `${GOOGLE_PLAY_URL}&referrer=${referrer}`

  // Apple `ct` is free campaign text, <=40 chars; `pt` is the provider token,
  // `mt=8` marks it an app link.
  const ct = `${params.utm_source}_${params.utm_campaign}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 40)
  const appStoreParams = new URLSearchParams({ ct, mt: '8' })
  if (APP_STORE_PROVIDER_TOKEN) appStoreParams.set('pt', APP_STORE_PROVIDER_TOKEN)
  const appStoreUrl = `${APP_STORE_URL}?${appStoreParams.toString()}`

  return { appStoreUrl, googlePlayUrl }
}
