import countries from './countries.json'

export interface Country {
  // Display name keyed by i18n locale code; `en` is always present as fallback.
  name: { en: string } & Partial<Record<string, string>>
  code: string
}

export const COUNTRIES: readonly Country[] = countries

// Pulled to the top of the Region selector, in this order.
export const PRIORITY_COUNTRY_CODES = ['HK', 'TW'] as const

// All ISO-3166-1 alpha-2 codes
export const COUNTRY_CODES = Object.freeze(COUNTRIES.map(country => country.code))
