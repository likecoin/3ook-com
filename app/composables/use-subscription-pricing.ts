import { convertUSDPriceToCurrency } from '~/utils/pricing'

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

  const yearlyDiscountPercent = computed(() => {
    const originalYearlyCost = actualMonthlyPrice.value * 12
    const discountedAmount = originalYearlyCost - actualYearlyPrice.value
    if (discountedAmount <= 0) {
      return 0
    }
    return Math.round(discountedAmount / originalYearlyCost * 100)
  })

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
