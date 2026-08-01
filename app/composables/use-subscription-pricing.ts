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
  const {
    yearly,
    monthly,
    civicYearly,
    civicMonthly,
  } = config.public.subscription.pricing
  const { displayCurrency } = usePaymentCurrency()

  const originalYearlyPrice = computed(() => convertUSDPriceToCurrency(Number(yearly.original), displayCurrency.value))
  const actualYearlyPrice = computed(() => convertUSDPriceToCurrency(Number(yearly.actual), displayCurrency.value))
  const originalMonthlyPrice = computed(() => convertUSDPriceToCurrency(Number(monthly.original), displayCurrency.value))
  const actualMonthlyPrice = computed(() => convertUSDPriceToCurrency(Number(monthly.actual), displayCurrency.value))
  const civicYearlyPrice = computed(() => convertUSDPriceToCurrency(Number(civicYearly.actual), displayCurrency.value))
  const civicMonthlyPrice = computed(() => convertUSDPriceToCurrency(Number(civicMonthly.actual), displayCurrency.value))

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

  // Multiply after conversion; the tier-table lookup is non-linear.
  function getMonthsPrice(months: number): number {
    return actualMonthlyPrice.value * months
  }

  // Single source of truth for the tier × period → price grid, so checkout and
  // the success-page conversion value resolve the same number.
  function getTierPrice(tier: LikerPlusTier, plan: SubscriptionPlan): number {
    const isYearly = plan === 'yearly'
    if (tier === 'civic') return isYearly ? civicYearlyPrice.value : civicMonthlyPrice.value
    return isYearly ? actualYearlyPrice.value : actualMonthlyPrice.value
  }

  return {
    yearlyPrice: readonly(actualYearlyPrice),
    monthlyPrice: readonly(actualMonthlyPrice),
    originalYearlyPrice: readonly(originalYearlyPrice),
    originalMonthlyPrice: readonly(originalMonthlyPrice),
    civicYearlyPrice: readonly(civicYearlyPrice),
    civicMonthlyPrice: readonly(civicMonthlyPrice),
    getMonthsPrice,
    getTierPrice,
    currency,
    convertToDisplayCurrency,
    yearlyDiscountPercent,
    hasYearlyDiscount,
    hasMonthlyDiscount,
  }
}
