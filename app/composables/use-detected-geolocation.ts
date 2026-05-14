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

export function useDetectedGeolocation() {
  const detectedCountry = useState<string | null>('detected-country', () => null)

  function initializeServerGeolocation() {
    const countryFromHeaders = getDetectedCountryFromHeaders()
    if (countryFromHeaders) {
      detectedCountry.value = countryFromHeaders
    }
  }

  function initializeClientGeolocation() {
    if (!detectedCountry.value) {
      detectedCountry.value = getDetectedCountryFromBrowserLocale()
    }
  }

  return {
    detectedCountry: readonly(detectedCountry),
    initializeServerGeolocation,
    initializeClientGeolocation,
  }
}
