import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, type Ref } from 'vue'
import type { PaymentCurrency, UserSettingsData } from '~~/shared/types/user-settings'

type UsePaymentCurrency = typeof import('~/composables/use-payment-currency').usePaymentCurrency

const {
  mockAccountSettings,
  mockDetectedCountry,
  mockHasLoggedIn,
  mockStates,
  mockSyncedCurrency,
} = vi.hoisted(() => ({
  mockAccountSettings: { value: {} as UserSettingsData },
  mockDetectedCountry: { value: null as string | null },
  mockHasLoggedIn: { value: false },
  mockStates: new Map<string, Ref<PaymentCurrency>>(),
  mockSyncedCurrency: { value: 'auto' as PaymentCurrency },
}))

mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
// Keyed like the real useState, so instances share state as app.vue relies on
mockNuxtImport('useState', () => (key: string, init: () => PaymentCurrency) => {
  const existing = mockStates.get(key)
  if (existing) return existing
  const state = ref(init())
  mockStates.set(key, state)
  return state
})
mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn }))
mockNuxtImport('useUserSettingsStore', () => () => ({
  ensureInitialized: vi.fn(),
  getSettings: () => mockAccountSettings.value,
}))
mockNuxtImport('useSyncedUserSettings', () => () => mockSyncedCurrency)
mockNuxtImport('useDetectedGeolocation', () => () => ({
  detectedCountry: mockDetectedCountry,
  initializeClientGeolocation: vi.fn(),
}))

describe('usePaymentCurrency', () => {
  let usePaymentCurrency: UsePaymentCurrency

  beforeEach(async () => {
    localStorage.clear()
    mockAccountSettings.value = {}
    mockDetectedCountry.value = 'US'
    mockHasLoggedIn.value = false
    mockStates.clear()
    mockSyncedCurrency.value = 'auto'
    // The localStorage ref is module-scoped and shared, so re-evaluate the module
    // to hand each test a fresh one reading the storage cleared above.
    vi.resetModules()
    ;({ usePaymentCurrency } = await import('~/composables/use-payment-currency'))
  })

  it('applies the account currency over the detected default after logging in', async () => {
    const { currency, displayCurrency, initializePaymentCurrency } = usePaymentCurrency()
    await initializePaymentCurrency()
    expect(displayCurrency.value).toBe('usd')

    // Login is in-page, so app.vue re-runs this once the account settings land
    mockHasLoggedIn.value = true
    mockAccountSettings.value = { currency: 'twd' }
    await initializePaymentCurrency()

    expect(currency.value).toBe('twd')
    expect(displayCurrency.value).toBe('twd')
  })

  it('never writes the resolved default back to the account', async () => {
    // A saved TWD the settings fetch failed to return: resolving must not clobber it
    mockHasLoggedIn.value = true
    mockSyncedCurrency.value = 'twd'
    const { currency, initializePaymentCurrency } = usePaymentCurrency()
    await initializePaymentCurrency()

    expect(currency.value).toBe('auto')
    expect(mockSyncedCurrency.value).toBe('twd')
  })

  it('keeps a device-local leftover out of the account', async () => {
    // A currency this device kept from an earlier session, restored before login
    localStorage.setItem('payment_currency', 'hkd')
    vi.resetModules()
    const { usePaymentCurrency: reload } = await import('~/composables/use-payment-currency')
    mockHasLoggedIn.value = true
    const { currency, initializePaymentCurrency } = reload()
    await initializePaymentCurrency()

    expect(currency.value).toBe('hkd')
    expect(mockSyncedCurrency.value).toBe('auto')
  })

  it('shares one localStorage ref across instances', async () => {
    const { setCurrency } = usePaymentCurrency()
    const { currency, initializePaymentCurrency } = usePaymentCurrency()

    setCurrency('hkd')
    await initializePaymentCurrency()

    // useStorage's write-back lands a tick later, so a per-instance copy would
    // still read 'auto' here and resolve the shared state back down to it
    expect(currency.value).toBe('hkd')
  })

  it('persists an explicit currency choice to the account', () => {
    mockHasLoggedIn.value = true
    const { currency, setCurrency } = usePaymentCurrency()
    setCurrency('hkd')

    expect(currency.value).toBe('hkd')
    expect(mockSyncedCurrency.value).toBe('hkd')
  })

  it('keeps an explicit currency choice out of the account while logged out', () => {
    const { currency, setCurrency } = usePaymentCurrency()
    setCurrency('hkd')

    expect(currency.value).toBe('hkd')
    expect(mockSyncedCurrency.value).toBe('auto')
  })
})
