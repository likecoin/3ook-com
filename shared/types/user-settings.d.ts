export type LocaleCode = 'en' | 'zh-Hant'
export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'
export type ColorMode = 'light' | 'dark' | 'system'
export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
  colorMode?: ColorMode
  isAdultContentEnabled?: boolean
}

export type UserSettingKey = 'locale' | 'currency' | 'colorMode' | 'isAdultContentEnabled'

export interface UserSettingsData extends BaseUserSettingsData {
  updatedAt?: number
}
