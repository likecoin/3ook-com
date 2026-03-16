import type { LocaleCode } from '~/composables/use-auto-locale'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'
export type ColorMode = 'light' | 'dark' | 'system'
export type TTSCantoneseModel = '2.6' | '2.8'

export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
  colorMode?: ColorMode
  isAdultContentEnabled?: boolean
  ttsCantoneseModel?: TTSCantoneseModel
}

export type UserSettingKey = 'locale' | 'currency' | 'colorMode' | 'isAdultContentEnabled' | 'ttsCantoneseModel'
