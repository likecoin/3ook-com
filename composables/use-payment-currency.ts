import { useStorage } from '@vueuse/core'
import type { PaymentCurrency } from '~/shared/types/user-settings'
import type { PricingCurrency } from '~/utils/pricing'

export function getCurrencyOptions($t: (key: string) => string): Array<{ label: string, value: PaymentCurrency }> {
  return [
    { label: `🌐 ${$t('currency_auto')}`, value: 'auto' },
    { label: '🇭🇰 HKD', value: 'hkd' },
    { label: '🇹🇼 TWD', value: 'twd' },
    { label: '🇺🇸 USD', value: 'usd' },
  ]
}

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

export function usePaymentCurrency() {
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const syncedCurrency = useSyncedUserSettings({
    key: 'currency',
    defaultValue: 'auto',
  })

  const localStorageCurrency = useStorage<PaymentCurrency>('payment_currency', 'auto')

  const currency = useState<PaymentCurrency>('payment-currency', () => 'auto')

  const detectedCurrency = computed(() => getDefaultCurrencyFromCountry(detectedCountry.value))

  function setCurrency(value: PaymentCurrency) {
    if (hasLoggedIn.value) {
      syncedCurrency.value = value
    }
    localStorageCurrency.value = value
    currency.value = value
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

    setCurrency(storedCurrency || localStorageCurrency.value || 'auto')
  }

  return {
    currency: readonly(currency),
    detectedCurrency: readonly(detectedCurrency),
    displayCurrency: readonly(displayCurrency),
    setCurrency,
    getCheckoutCurrency,
    initializePaymentCurrency,
  }
}
