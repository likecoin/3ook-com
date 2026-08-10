import { useStorage } from '@vueuse/core'
import type { LocaleCode } from '~~/shared/types/user-settings'

function getDefaultLocaleFromCountry(country: string | null): LocaleCode {
  switch (country) {
    case 'HK':
    case 'TW':
    case 'CN':
    case 'MO':
    case 'SG':
    case 'MY':
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

  const syncedLocale = useSyncedUserSettings({
    key: 'locale',
    defaultValue: null,
  })

  const detectedLocale = computed(() => getDefaultLocaleFromCountry(detectedCountry.value))

  // Automatic sources (geolocation, campaign links) must never overwrite
  // an explicit user choice, so this stops short of the account setting.
  function applyLocale(locale: LocaleCode) {
    localStorageLocale.value = locale
    i18n.setLocale(locale)
  }

  function setLocale(locale: LocaleCode) {
    if (hasLoggedIn.value) {
      syncedLocale.value = locale
    }
    applyLocale(locale)
  }

  async function initializeLocale() {
    // Don't override locale if the URL has an explicit locale prefix (e.g. /en/about)
    const route = useRoute()
    const hasExplicitLocalePrefix = i18n.locales.value.some(
      (l) => {
        const code = typeof l === 'string' ? l : l.code
        return route.path.startsWith(`/${code}/`) || route.path === `/${code}`
      },
    )
    if (hasExplicitLocalePrefix) return

    // Force Chinese locale when UTM campaign is set (campaign content is Chinese)
    const hasCampaignUtm = !!(route.query.utm_campaign || route.query.utm_term)
    if (hasCampaignUtm) {
      applyLocale('zh-Hant')
      return
    }

    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }

    if (hasLoggedIn.value) {
      await userSettingsStore.ensureInitialized()
    }

    applyLocale(syncedLocale.value || localStorageLocale.value || detectedLocale.value)
  }

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: readonly(detectedLocale),
    setLocale,
    initializeLocale,
  }
}
