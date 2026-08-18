import { getIsInternalLLSource, getIsNonChannelInstallSource } from '~~/shared/constants/analytics'
import { getInstallAttribution } from '~/utils/native-bridge'

// Meta's click-attribution window; install click ids older than this are dropped
// so stale clicks aren't sent to CAPI. UTM has no window (tagged instead).
const INSTALL_CLICK_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000

// Blocked or half-initialized PostHog builds can lack `get_property` entirely;
// omit the field rather than throwing out of the `onLoaded` callback.
function getPostHogProperty(
  posthog: { get_property?: (key: string) => unknown },
  key: string,
) {
  const value = posthog.get_property?.(key)
  return typeof value === 'string' && value ? value : undefined
}

// RevenueCat's reserved $mediaSource / $campaign: the channel that acquired the
// subscriber, sticky forever once written. Takes the first rung naming a real one
// and stays blank otherwise — unlike `utmSource`, kept last-touch for the webhook.
function getAcquisitionChannel({
  install,
  liveSource,
  liveCampaign,
  initialSource,
  initialCampaign,
}: {
  install: InstallAttribution | null
  liveSource?: string
  liveCampaign?: string
  initialSource?: string
  initialCampaign?: string
}) {
  // Store-supplied and untamperable, but not automatically a real channel: our own
  // download links tag the referrer `3ookcom`, and Play's organic default
  // (`google-play`/`organic`) names no channel at all.
  const installAttribution = install?.attribution
  if (installAttribution?.utm_source
    && !getIsInternalLLSource(installAttribution.utm_source)
    && !getIsNonChannelInstallSource(installAttribution.utm_source)
    && installAttribution.utm_medium?.toLowerCase() !== 'organic') {
    return {
      mediaSource: installAttribution.utm_source,
      campaign: installAttribution.utm_campaign,
    }
  }
  if (liveSource && !getIsInternalLLSource(liveSource)) {
    return { mediaSource: liveSource, campaign: liveCampaign }
  }
  // Internal-filtered where it is read; a first touch still names a real channel
  // when nothing more recent does.
  if (initialSource) return { mediaSource: initialSource, campaign: initialCampaign }
  return { mediaSource: undefined, campaign: undefined }
}

export function useAnalytics() {
  const getRouteQuery = useRouteQuery()
  const { proxy } = useScriptGoogleAnalytics()
  const { onLoaded: onPostHogLoaded } = useScriptPostHog()
  const googleAnalyticsTrackingId = useRuntimeConfig().public.scripts.googleAnalytics.id

  const gaClientId = ref('')
  const gaSessionId = ref('')
  const referrer = ref('')
  const posthogDistinctId = ref<string | undefined>(undefined)
  const initialUTMSource = ref<string | undefined>(undefined)
  const initialUTMMedium = ref<string | undefined>(undefined)
  const initialUTMCampaign = ref<string | undefined>(undefined)
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
      // First-touch super-properties, seeded once per browser. Require a genuine
      // external source before trusting any of the triple: pre-split clients hold
      // internal surfaces here, sometimes as a medium with no source at all, and a
      // bad value sticks forever once on a RevenueCat subscriber.
      const source = getPostHogProperty(posthog, 'initial_utm_source')
      if (!source || getIsInternalLLSource(source)) return
      initialUTMSource.value = source
      initialUTMMedium.value = getPostHogProperty(posthog, 'initial_utm_medium')
      initialUTMCampaign.value = getPostHogProperty(posthog, 'initial_utm_campaign')
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

    // Fall back to the install referrer only when the live session has no external
    // value, so live last-touch always wins; click ids (`gated`) are additionally
    // limited to the freshness window. Fills are flagged via `attributionSource`.
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
    const liveCampaign = getRouteQuery('utm_campaign')
    const utmCampaign = withInstall(liveCampaign, 'utm_campaign')
    // The install referrer outranks internal link tags (`ll_*`) and caller
    // defaults — in the app, checkout is always reached via an upsell that sets
    // `ll_source`, so folding those into `live` would never let install fill.
    const utmMediumResolved = withInstall(resolvedUtmMedium, 'utm_medium') || getRouteQuery('ll_medium') || utmMedium
    const utmSourceResolved = withInstall(resolvedUtmSource, 'utm_source') || getRouteQuery('ll_source') || utmSource
    const utmContent = withInstall(getRouteQuery('utm_content'), 'utm_content')
    const utmTerm = withInstall(getRouteQuery('utm_term'), 'utm_term')
    const gadClickId = withInstall(getRouteQuery('gclid'), 'gclid', true)
    const gadSource = withInstall(getRouteQuery('gad_source'), 'gad_source', true)
    const fbClickId = withInstall(getRouteQuery('fbclid'), 'fbclid', true)

    // `resolvedUtmSource`, not `utmSourceResolved` above: an internal `ll_source`
    // must never name the acquisition channel, and `srsltid` has already resolved
    // to a real one here.
    const { mediaSource, campaign } = getAcquisitionChannel({
      install,
      liveSource: resolvedUtmSource,
      liveCampaign,
      initialSource: initialUTMSource.value,
      initialCampaign: initialUTMCampaign.value,
    })

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
      // Never falls back to the install referrer or query: both are last-touch.
      // Keys stay `initialUtm*`: they are the `/plus/new` body and RevenueCat
      // subscriber attribute names, not local identifiers.
      initialUtmSource: initialUTMSource.value,
      initialUtmMedium: initialUTMMedium.value,
      initialUtmCampaign: initialUTMCampaign.value,
      attributionSource: usedInstall ? 'install_referrer' : undefined,
      mediaSource,
      campaign,
    }
  }

  return {
    gaClientId,
    gaSessionId,
    getAnalyticsParameters,
  }
}
