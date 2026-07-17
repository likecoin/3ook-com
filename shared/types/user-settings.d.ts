import type { COUNTRY_CODES } from '~~/shared/constants/country-codes'

export type LocaleCode = 'en' | 'zh-Hant'
export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'
export type ColorMode = 'light' | 'dark' | 'system'
export type RegionCode = typeof COUNTRY_CODES[number]
export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
  colorMode?: ColorMode
  isAdultContentEnabled?: boolean
  region?: RegionCode
}

export type UserSettingKey = 'locale' | 'currency' | 'colorMode' | 'isAdultContentEnabled' | 'region'

export interface UserSettingsData extends BaseUserSettingsData {
  updatedAt?: number
}
