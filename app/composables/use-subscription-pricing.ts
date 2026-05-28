import { convertUSDPriceToCurrency } from '~/utils/pricing'

// Rounds down to 0 when the yearly costs more than 12× monthly, so callers can
// gate "save X%" badges off the result without showing a misleading "save 0%".
export function calcYearlyDiscountPercent(monthly: number, yearly: number): number {
  const baselineYearly = monthly * 12
  const discountedAmount = baselineYearly - yearly
  if (discountedAmount <= 0) return 0
  return Math.round(discountedAmount / baselineYearly * 100)
}

export default function useSubscriptionPricing() {
  const config = useRuntimeConfig()
  const { yearly, monthly } = config.public.subscription.pricing
  const { displayCurrency } = usePaymentCurrency()

  const originalYearlyPrice = computed(() => convertUSDPriceToCurrency(Number(yearly.original), displayCurrency.value))
  const actualYearlyPrice = computed(() => convertUSDPriceToCurrency(Number(yearly.actual), displayCurrency.value))
  const originalMonthlyPrice = computed(() => convertUSDPriceToCurrency(Number(monthly.original), displayCurrency.value))
  const actualMonthlyPrice = computed(() => convertUSDPriceToCurrency(Number(monthly.actual), displayCurrency.value))

  const currency = computed(() => {
    switch (displayCurrency.value) {
      case 'hkd': return 'HK'
      case 'twd': return 'NT'
      default: return 'US'
    }
  })

  function convertToDisplayCurrency(usdPrice: number) {
    return convertUSDPriceToCurrency(usdPrice, displayCurrency.value)
  }

  const hasMonthlyDiscount = computed(() => actualMonthlyPrice.value < originalMonthlyPrice.value)
  const hasYearlyDiscount = computed(() => actualYearlyPrice.value < originalYearlyPrice.value)

  const yearlyDiscountPercent = computed(() => calcYearlyDiscountPercent(actualMonthlyPrice.value, actualYearlyPrice.value))

  return {
    yearlyPrice: readonly(actualYearlyPrice),
    monthlyPrice: readonly(actualMonthlyPrice),
    originalYearlyPrice: readonly(originalYearlyPrice),
    originalMonthlyPrice: readonly(originalMonthlyPrice),
    currency,
    convertToDisplayCurrency,
    yearlyDiscountPercent,
    hasYearlyDiscount,
    hasMonthlyDiscount,
  }
}
