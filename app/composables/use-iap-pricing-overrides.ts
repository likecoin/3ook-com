import { calcYearlyDiscountPercent } from '~/composables/use-subscription-pricing'
import { DEFAULT_TRIAL_PERIOD_DAYS } from '~~/shared/constants/pricing'

const MIN_DISCOUNT_PERCENT_TO_SHOW = 1

export type IAPOverrides = {
  trialPeriodDays: number
  isPaidTrialOverride: boolean | undefined
  trialPriceString: string | undefined
  monthlyPriceString: string | undefined
  yearlyPriceString: string | undefined
  yearlyBadgeText: string | undefined
}

// Returns the Plus-pricing prop overrides for the current runtime: on the
// native IAP build the values come from the store's offerings; on web they
// fall back to Stripe's configured defaults. Triggers ensureOfferings() so
// consumers don't have to remember to load before reading.
export function useIAPPricingOverrides() {
  const { isIAPSupported, ensureOfferings, getIAPTrial, getIAPPlanPrice } = useNativeIAP()
  const { t: $t } = useI18n()

  if (import.meta.client) ensureOfferings()

  const iapMonthlyPrice = computed(() => isIAPSupported.value ? getIAPPlanPrice('monthly') : undefined)
  const iapYearlyPrice = computed(() => isIAPSupported.value ? getIAPPlanPrice('yearly') : undefined)
  // Recompute the badge percent from real store prices — the default math in
  // useSubscriptionPricing runs on the Stripe-USD conversion and can disagree
  // with the store's numbers. Undefined when prices haven't loaded yet or when
  // rounding to <1% (so we don't render a misleading "save 0%").
  const iapYearlyBadgeText = computed(() => {
    const monthly = iapMonthlyPrice.value?.price
    const yearly = iapYearlyPrice.value?.price
    if (!monthly || !yearly) return undefined
    const percent = calcYearlyDiscountPercent(monthly, yearly)
    if (percent < MIN_DISCOUNT_PERCENT_TO_SHOW) return undefined
    return $t('pricing_page_yearly_discount', { discount: percent })
  })

  // Every field set explicitly (DEFAULT_TRIAL_PERIOD_DAYS on web, store values
  // on IAP, undefined for the IAP-only fields off-IAP) so the consumer's
  // withDefaults can't fill a stale default when an omitted key gets a baked-
  // in value at create time.
  function getIAPOverrides(period: SubscriptionPlan): IAPOverrides {
    if (!isIAPSupported.value) {
      return {
        trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
        isPaidTrialOverride: undefined,
        trialPriceString: undefined,
        monthlyPriceString: undefined,
        yearlyPriceString: undefined,
        yearlyBadgeText: undefined,
      }
    }
    const trial = getIAPTrial(period)
    return {
      trialPeriodDays: trial.trialPeriodDays,
      isPaidTrialOverride: trial.isPaidTrial,
      trialPriceString: trial.trialPriceString,
      monthlyPriceString: iapMonthlyPrice.value?.priceString,
      yearlyPriceString: iapYearlyPrice.value?.priceString,
      yearlyBadgeText: iapYearlyBadgeText.value,
    }
  }

  return { isIAPSupported, iapMonthlyPrice, iapYearlyPrice, getIAPOverrides }
}
