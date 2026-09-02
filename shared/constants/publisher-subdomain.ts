import { formatLikerIdHandle } from '../utils/liker-id'
import type { StoreListingRouteName } from './store-routes'
import { getStorePublisherRouteName } from './store-routes'

// Publishers with a branded storefront subdomain at <likerId>.<apex>. Hand-approved
// rather than derived from checkLikerIdValid(): that charset allows `_` and a
// leading/trailing `-`, none of which are legal DNS labels.
export const PUBLISHER_SUBDOMAIN_LIKER_IDS: readonly string[] = ['ckxpress']

// The subdomain serves the store storefront only. Its library twin is the
// Plus-reading tab, which needs the session the apex owns.
const PUBLISHER_SUBDOMAIN_LISTING_ROUTE_NAME: StoreListingRouteName = 'store'

export const PUBLISHER_SUBDOMAIN_ROUTE_NAME
  = getStorePublisherRouteName(PUBLISHER_SUBDOMAIN_LISTING_ROUTE_NAME)

// Nitro re-enters middleware for the SSR render's own subrequests on this host,
// so these must resolve locally instead of being sent to another origin.
const INTERNAL_PATH_PREFIXES = ['/api/', '/_nuxt/', '/_ipx/', '/_i18n/', '/__nuxt']

// Per-origin PWA assets. Served here they would prompt a second app install and
// register a service worker scoped to the subdomain.
const BLOCKED_PATHS = ['/manifest.webmanifest', '/sw.js']

function getHostname(host: string) {
  return host.split(':')[0]?.toLowerCase() || ''
}

let cachedBaseURL: string | undefined
let cachedApexHostname = ''

// BASE_URL is not covered by the startup env gate, so a malformed value must not
// throw here: this runs on every request.
function getApexHostname(baseURL: string) {
  if (baseURL !== cachedBaseURL) {
    cachedBaseURL = baseURL
    try {
      cachedApexHostname = getHostname(new URL(baseURL).host)
    }
    catch {
      cachedApexHostname = ''
    }
  }
  return cachedApexHostname
}

export type PublisherSubdomainHost =
  | { type: 'none' }
  | { type: 'publisher', likerId: string }
  | { type: 'unclaimed' }

// Returned by nearly every request, so it is shared rather than allocated per call.
const HOST_NONE: PublisherSubdomainHost = { type: 'none' }

// Every host under the apex is ours to route, one label deep or more:
// an approved label owns its storefront,
// and anything else is only squatting on the wildcard record.
export function getPublisherSubdomainHost(host: string, baseURL: string): PublisherSubdomainHost {
  const apexHostname = getApexHostname(baseURL)
  if (!apexHostname) return HOST_NONE

  const hostname = getHostname(host)
  const suffix = `.${apexHostname}`
  if (!hostname.endsWith(suffix)) return HOST_NONE

  const label = hostname.slice(0, -suffix.length)
  return PUBLISHER_SUBDOMAIN_LIKER_IDS.includes(label)
    ? { type: 'publisher', likerId: label }
    : { type: 'unclaimed' }
}

// '' for the default locale, '/<code>' for the rest — mirrors prefix_except_default.
export function getLocalePathPrefixes(i18n: {
  defaultLocale?: string
  locales?: readonly { code: string }[]
}) {
  return (i18n.locales ?? []).map(({ code }) => (code === i18n.defaultLocale ? '' : `/${code}`))
}

export function getStorePublisherPath(likerId: string, localePrefix = '') {
  return `${localePrefix}/${PUBLISHER_SUBDOMAIN_LISTING_ROUTE_NAME}/${formatLikerIdHandle(likerId)}`
}

export type PublisherSubdomainAction =
  | { type: 'pass' }
  | { type: 'notFound' }
  | { type: 'self', path: string }
  | { type: 'apex', path: string }

// One page per subdomain, served at its localized roots. Everything else belongs
// to the apex, which owns checkout, the session, and every indexed URL — the
// storefront canonicals back to /store/@<likerId> there.
export function getPublisherSubdomainAction(
  pathname: string,
  likerId: string,
  localePrefixes: string[],
): PublisherSubdomainAction {
  if (INTERNAL_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) return { type: 'pass' }
  if (BLOCKED_PATHS.includes(pathname)) return { type: 'notFound' }

  // Lowercased so a shared /store/@CKXPRESS link normalizes instead of bouncing.
  const path = (pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname).toLowerCase()
  // The branded root is where this host serves the storefront,
  // so the apex's own path for it redirects onto the root.
  const publisherPrefix = localePrefixes.find(prefix => path === getStorePublisherPath(likerId, prefix))
  if (publisherPrefix !== undefined) return { type: 'self', path: publisherPrefix || '/' }

  const rootPrefix = localePrefixes.find(prefix => path === (prefix || '/'))
  if (rootPrefix !== undefined) return path === pathname ? { type: 'pass' } : { type: 'self', path }

  return { type: 'apex', path: pathname }
}
