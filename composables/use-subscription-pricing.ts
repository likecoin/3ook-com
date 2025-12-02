export default function useSubscriptionPricing() {
  const config = useRuntimeConfig()
  const { yearly, monthly } = config.public.subscription.pricing
  const originalYearlyPrice = ref(Number(yearly.original))
  const actualYearlyPrice = ref(Number(yearly.actual))
  const originalMonthlyPrice = ref(Number(monthly.original))
  const actualMonthlyPrice = ref(Number(monthly.actual))

  const currency = ref('US')

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
    yearlyDiscountPercent,
    hasYearlyDiscount,
    hasMonthlyDiscount,
  }
}
