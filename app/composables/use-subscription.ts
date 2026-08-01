import { PLUS_BOOK_PURCHASE_DISCOUNT } from '~~/shared/constants/pricing'
import { getEffectiveLikerPlusTier } from '~~/shared/utils/subscription'

export function useSubscription() {
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const { displayCurrency, getCheckoutCurrency } = usePaymentCurrency()

  const {
    monthlyPrice,
    yearlyPrice,
    civicMonthlyPrice,
    civicYearlyPrice,
    getMonthsPrice,
    getTierPrice,
  } = useSubscriptionPricing()

  const currency = computed(() => displayCurrency.value.toUpperCase())

  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus ?? false
  })

  const isExpiredLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isExpiredLikerPlus ?? false
  })

  const likerPlusPeriod = computed(() => {
    if (!hasLoggedIn.value || !isLikerPlus.value) return undefined
    return user.value?.likerPlusPeriod || undefined
  })

  const likerPlusTier = computed<LikerPlusTier | undefined>(() => {
    if (!hasLoggedIn.value) return undefined
    return getEffectiveLikerPlusTier(user.value)
  })

  const isCivicMember = computed(() => likerPlusTier.value === 'civic')

  // A monthly subscriber moving to yearly — the one in-place period change. Bridges
  // likerPlusPeriod (LikerPlusStatus) and the target SubscriptionPlan so callers
  // don't compare the two vocabularies by raw string.
  function isPlanPeriodUpgrade(targetPlan?: SubscriptionPlan): boolean {
    return likerPlusPeriod.value === 'month' && targetPlan === 'yearly'
  }

  function getPlusDiscountPrice(price: number): number | null {
    if (isLikerPlus.value && price > 0) {
      return Math.round(price * (1 - PLUS_BOOK_PURCHASE_DISCOUNT) * 100) / 100
    }
    return null
  }

  function getPlusDiscountRate(): number {
    if (isLikerPlus.value) {
      return (1 - PLUS_BOOK_PURCHASE_DISCOUNT)
    }
    return 0
  }

  return {
    yearlyPrice,
    monthlyPrice,
    civicYearlyPrice,
    civicMonthlyPrice,
    getMonthsPrice,
    getTierPrice,
    currency,

    isLikerPlus,
    isExpiredLikerPlus,
    likerPlusPeriod,
    likerPlusTier,
    isCivicMember,
    isPlanPeriodUpgrade,
    hasLoggedIn,
    getPlusDiscountPrice,
    getPlusDiscountRate,
    getCheckoutCurrency,
    PLUS_BOOK_PURCHASE_DISCOUNT,
  }
}
