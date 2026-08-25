function getDetectedCountryFromHeaders(): string | null {
  if (import.meta.server) {
    const headers = useRequestHeaders()
    const country = headers['cf-ipcountry']?.toUpperCase()
    return country || null
  }
  return null
}

function getDetectedCountryFromBrowserLocale(): string {
  if (import.meta.client) {
    const locale = navigator.language || navigator.languages?.[0]
    if (locale) {
      // Extract country code from locale (e.g., "zh-TW" -> "TW", "en-US" -> "US")
      const parts = locale.split('-')
      if (parts.length > 1) {
        return parts[1]!.toUpperCase()
      }
      if (locale.toLowerCase().startsWith('zh')) {
        return 'HK'
      }
    }
  }
  return 'US'
}

// Exposed on its own so the per-card region gate can read the header country
// without also building the derived detectedCountry it never looks at.
export function useIPCountryState() {
  return useState<string | null>('ip-country', () => null)
}

export function useDetectedGeolocation() {
  // Split by trust, and derived rather than hand-synced: the header is where the
  // reader is, the locale is a language preference that reads as 'US' when it
  // carries no region. Compliance gates take ipCountry, never the guess.
  const ipCountry = useIPCountryState()
  const localeCountry = useState<string | null>('locale-country', () => null)
  const detectedCountry = computed(() => ipCountry.value || localeCountry.value)

  function initializeServerGeolocation() {
    ipCountry.value = getDetectedCountryFromHeaders()
  }

  function initializeClientGeolocation() {
    if (!detectedCountry.value) {
      localeCountry.value = getDetectedCountryFromBrowserLocale()
    }
  }

  return {
    detectedCountry,
    ipCountry: readonly(ipCountry),
    initializeServerGeolocation,
    initializeClientGeolocation,
  }
}
