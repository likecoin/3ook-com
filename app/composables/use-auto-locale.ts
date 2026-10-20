import { useStorage } from '@vueuse/core'
import type { LocaleCode } from '~~/shared/types/user-settings'

// Registered as a PostHog super property so funnel cuts read it off the event
// rather than off a latest-value person profile.
export type LocaleSource = 'url' | 'account' | 'stored' | 'campaign' | 'entry-route' | 'geo' | 'user'

// Entry routes whose copy is authored in Chinese. A guest landing on one holds
// the site default instead of the geo guess, which SSR already disagrees with.
const ZH_HANT_ENTRY_ROUTE_NAMES = ['member']

export function getGuestEntryLocale(routeName: string, detected: LocaleCode): LocaleCode {
  return ZH_HANT_ENTRY_ROUTE_NAMES.includes(routeName) ? 'zh-Hant' : detected
}

function getDefaultLocaleFromCountry(country: string | null): LocaleCode {
  switch (country) {
    case 'HK':
    case 'TW':
    case 'CN':
    case 'MO':
    case 'SG':
    case 'MY':
    case 'GB':
      return 'zh-Hant'
    default:
      return 'en'
  }
}

// One ref per document, not per call: useStorage defers its write-back a tick,
// so a sibling copy would still read the old value when initializeLocale
// resolves in the same tick.
const localStorageLocale = useStorage<LocaleCode | null>('user_locale', null)

export function useAutoLocale() {
  const i18n = useI18n()
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()
  const getRouteBaseNameString = useRouteBaseNameString()

  const syncedLocale = useSyncedUserSettings({
    key: 'locale',
    defaultValue: null,
  })

  const detectedLocale = computed(() => getDefaultLocaleFromCountry(detectedCountry.value))

  // Hoisted: the PostHog registry script is npm-mode, so every call allocates a
  // fresh stub with its own load subscription rather than reusing a cached one.
  const { onLoaded: onPostHogLoaded } = useScriptPostHog()

  function registerLocaleProperties(locale: LocaleCode, source: LocaleSource) {
    onPostHogLoaded(({ posthog }) => {
      posthog.register({ locale_resolved: locale, locale_source: source })
    })
  }

  // Automatic sources (geolocation, campaign links) must never overwrite
  // an explicit user choice, so this stops short of the account setting.
  function applyLocale(locale: LocaleCode, source: LocaleSource) {
    localStorageLocale.value = locale
    i18n.setLocale(locale)
    registerLocaleProperties(locale, source)
  }

  function setLocale(locale: LocaleCode) {
    if (hasLoggedIn.value) {
      syncedLocale.value = locale
    }
    applyLocale(locale, 'user')
  }

  async function initializeLocale() {
    // Don't override locale if the URL has an explicit locale prefix (e.g. /en/about)
    const route = useRoute()
    const getRouteQuery = useRouteQuery()
    const hasExplicitLocalePrefix = i18n.locales.value.some(
      (l) => {
        const code = typeof l === 'string' ? l : l.code
        return route.path.startsWith(`/${code}/`) || route.path === `/${code}`
      },
    )
    if (hasExplicitLocalePrefix) {
      // Registered here too, or a prefixed load would carry the previous
      // load's source and misattribute the funnel cut.
      registerLocaleProperties(i18n.locale.value as LocaleCode, 'url')
      return
    }

    // Force Chinese locale when UTM campaign is set (campaign content is Chinese),
    // except user share links (utm_campaign=share) which come from any locale
    const utmCampaign = getRouteQuery('utm_campaign')
    const hasCampaignUTM = !!(utmCampaign || getRouteQuery('utm_term')) && utmCampaign !== 'share'
    if (hasCampaignUTM) {
      applyLocale('zh-Hant', 'campaign')
      return
    }

    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }

    if (hasLoggedIn.value) {
      await userSettingsStore.ensureInitialized()
    }

    if (syncedLocale.value) {
      applyLocale(syncedLocale.value, 'account')
      return
    }
    if (localStorageLocale.value) {
      applyLocale(localStorageLocale.value, 'stored')
      return
    }

    // Inferred, never a choice: left unwritten so a page's default can't outlive
    // the visit as a site-wide preference the visitor never expressed.
    const detected = detectedLocale.value
    const entryLocale = getGuestEntryLocale(getRouteBaseNameString(), detected)
    i18n.setLocale(entryLocale)
    // 'entry-route' marks only the visitors this rule actually moved, so the
    // funnel cut compares them against the geo default instead of everyone.
    registerLocaleProperties(entryLocale, entryLocale === detected ? 'geo' : 'entry-route')
  }

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: readonly(detectedLocale),
    setLocale,
    initializeLocale,
  }
}
