import type { LocaleCode } from '~/composables/use-auto-locale'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'
export type ColorMode = 'light' | 'dark' | 'system'

export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
  colorMode?: ColorMode
}

export type UserSettingKey = 'locale' | 'currency' | 'colorMode'
