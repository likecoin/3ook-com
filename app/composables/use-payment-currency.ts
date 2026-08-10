import { useStorage } from '@vueuse/core'
import type { PaymentCurrency } from '~~/shared/types/user-settings'
import type { PricingCurrency } from '~/utils/pricing'

function getDefaultCurrencyFromCountry(country: string | null): PricingCurrency {
  switch (country) {
    case 'HK':
      return 'hkd'
    case 'TW':
      return 'twd'
    default:
      return 'usd'
  }
}

// One ref per document, not per call: book cards instantiate this composable
// ~3x each, and useStorage defers its write-back a tick, so sibling copies would
// still read the old value when initialization resolves in the same tick.
const localStorageCurrency = useStorage<PaymentCurrency>('payment_currency', 'auto')

export function usePaymentCurrency() {
  const { t: $t } = useI18n()
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const options = computed<Array<{ label: string, value: PaymentCurrency }>>(() => [
    { label: `🌐 ${$t('currency_auto')}`, value: 'auto' },
    { label: '🇭🇰 HKD', value: 'hkd' },
    { label: '🇹🇼 TWD', value: 'twd' },
    { label: '🇺🇸 USD', value: 'usd' },
  ])

  const syncedCurrency = useSyncedUserSettings({
    key: 'currency',
    defaultValue: 'auto',
  })

  const currency = useState<PaymentCurrency>('payment-currency', () => 'auto')

  const detectedCurrency = computed(() => getDefaultCurrencyFromCountry(detectedCountry.value))

  // Automatic sources (geolocation, a device-local leftover) must never overwrite
  // an explicit user choice, so this stops short of the account setting.
  function applyCurrency(value: PaymentCurrency) {
    localStorageCurrency.value = value
    currency.value = value
  }

  function setCurrency(value: PaymentCurrency) {
    if (hasLoggedIn.value) {
      syncedCurrency.value = value
    }
    applyCurrency(value)
  }

  const displayCurrency = computed<PricingCurrency>(() => {
    if (currency.value === 'auto') {
      return detectedCurrency.value
    }
    return currency.value as PricingCurrency
  })

  function getCheckoutCurrency(): string {
    if (currency.value === 'auto') {
      return detectedCurrency.value
    }
    return currency.value.toLowerCase()
  }

  async function initializePaymentCurrency() {
    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }

    let storedCurrency: PaymentCurrency | undefined
    if (hasLoggedIn.value) {
      await userSettingsStore.ensureInitialized()
      storedCurrency = userSettingsStore.getSettings()?.currency
    }

    applyCurrency(storedCurrency || localStorageCurrency.value || 'auto')
  }

  return {
    currency: readonly(currency),
    detectedCurrency: readonly(detectedCurrency),
    displayCurrency: readonly(displayCurrency),
    options,
    setCurrency,
    getCheckoutCurrency,
    initializePaymentCurrency,
  }
}
