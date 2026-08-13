<template>
  <div class="flex flex-col gap-2 laptop:gap-3">
    <header
      v-if="!isYearlyHidden && !isMonthlyHidden"
      class="flex items-center justify-between mb-1 laptop:hidden"
    >
      <slot name="header-left" />

      <div class="inline-flex ml-auto p-0.5 bg-theme-black/8 dark:bg-theme-white/8 rounded-full">
        <button
          v-for="option in toggleOptions"
          :key="option.key"
          type="button"
          :class="[
            'px-4 py-1',
            'text-xs font-semibold',
            'rounded-full',
            'transition-all duration-200',
            'cursor-pointer',
            selectedKey === option.key
              ? 'bg-theme-white dark:bg-theme-black text-theme-black dark:text-theme-white shadow-sm'
              : 'text-theme-black/40 dark:text-theme-white/40',
          ]"
          @click="selectedKey = option.key"
          v-text="option.label"
        />
      </div>
    </header>

    <label
      v-for="plan in plans"
      :key="plan.key"
      :class="[
        'relative',

        'flex',
        'justify-between',
        'items-center',

        'px-4',
        'py-3 laptop:py-4',

        'bg-theme-white dark:bg-theme-black',
        'text-theme-black dark:text-theme-white',
        'rounded-lg',

        'border-2',
        plan.isSelected
          ? 'border-theme-black dark:border-theme-white'
          : 'border-theme-black/40 dark:border-theme-white/40',

        'mb-1',
        'hover:mb-0',
        'hover:border-b-6',
        'hover:-translate-y-1',

        'cursor-pointer',

        'transition-all',
        'duration-200',
        'ease-in-out',

        'before:content-[_]',
        'before:absolute',
        'before:inset-0',
        'before:transition-colors',
        'before:duration-[inherit]',
        'before:ease-[inherit]',
        'before:pointer-events-none',
        'hover:before:bg-theme-black/5',

        !plan.isSelected && !isYearlyHidden && !isMonthlyHidden
          ? 'max-laptop:hidden'
          : '',
      ]"
    >
      <aside
        v-if="plan.badgeText"
        :class="[
          'absolute',
          'top-0',
          'right-4',

          'px-1.5 laptop:px-3',
          'py-0.5 laptop:py-1',

          'bg-theme-black dark:bg-theme-cyan',

          'text-theme-cyan dark:text-theme-black',
          'text-xs',
          'font-semibold',

          'rounded-lg',

          '-translate-y-1/2',
        ]"
        v-text="plan.badgeText"
      />

      <div class="flex items-center">
        <div
          :class="[
            'size-5 shrink-0 mr-4 rounded-full border-2',
            plan.isSelected
              ? 'bg-theme-black dark:bg-theme-cyan border-theme-black dark:border-theme-cyan'
              : 'bg-transparent border-theme-black/40 dark:border-theme-cyan/40',
            !isYearlyHidden && !isMonthlyHidden ? 'max-laptop:hidden' : '',
          ]"
        >
          <UIcon
            v-show="plan.isSelected"
            name="i-material-symbols-check"
            class="block text-theme-cyan dark:text-theme-black"
            :size="16"
          />
        </div>

        <span
          class="text-md font-semibold"
          v-text="plan.label"
        />
      </div>

      <div class="flex flex-col justify-center min-h-16 laptop:min-h-18 text-xs laptop:text-sm text-right">
        <template v-if="isPaidTrial && plan.showTrialPrice">
          <span class="font-bold whitespace-nowrap text-theme-black dark:text-theme-white">
            <span
              v-if="props.trialPriceString"
              class="text-lg laptop:text-2xl"
              v-text="props.trialPriceString"
            />
            <template v-else>
              <span>{{ currency }}&nbsp;</span>
              <span
                class="text-lg laptop:text-2xl"
                v-text="`$${convertedTrialPrice}`"
              />
            </template>
            <span> /{{ $t('plan_select_trial_days_unit', { days: trialPeriodDays }) }}</span>
          </span>
          <span class="text-theme-black/40 dark:text-theme-white/40 whitespace-nowrap">
            <span>{{ $t('plan_select_then_price_hint') }}&nbsp;</span>
            <span v-if="plan.priceString">{{ plan.priceString }}</span>
            <span v-else>{{ currency }} ${{ plan.price }}</span>
            <span>/{{ plan.perUnit }}</span>
          </span>
        </template>
        <template v-else-if="plan.promoPrice !== undefined">
          <span class="text-theme-black/60 line-through whitespace-nowrap">
            <span>{{ currency }}&nbsp;</span>
            <span v-text="`$${plan.price}`" />
            <span>/{{ plan.perUnit }}</span>
          </span>
          <span class="font-bold whitespace-nowrap text-theme-black dark:text-theme-white">
            <span
              v-if="plan.promoPrice === 0"
              class="text-lg laptop:text-xl"
              v-text="$t(plan.promoFreeKey)"
            />
            <i18n-t
              v-else
              :keypath="plan.promoAmountKey"
            >
              <template #currency>
                <span>{{ currency }}</span>
              </template>
              <template #price>
                <span
                  class="text-lg laptop:text-2xl"
                  v-text="`$${plan.promoPrice}`"
                />
              </template>
            </i18n-t>
          </span>
        </template>
        <template v-else>
          <div
            v-if="plan.hint"
            class="text-theme-black/60"
            v-text="plan.hint"
          />

          <span
            v-if="plan.hasDiscount && !plan.priceString"
            class="text-theme-black/60 after:content-['_']"
          >
            <span>{{ $t('pricing_page_original_price') }}&nbsp;</span>
            <span class="line-through">{{ currency }} ${{ plan.originalPrice }}</span>
          </span>

          <span class="font-bold whitespace-nowrap">
            <span
              v-if="plan.priceString"
              class="text-lg laptop:text-2xl"
              v-text="plan.priceString"
            />
            <template v-else>
              <span>{{ currency }}&nbsp;</span>
              <span
                class="text-lg laptop:text-2xl"
                v-text="`$${plan.price}`"
              />
            </template>
            <span>/{{ plan.perUnit }}</span>
          </span>
        </template>

        <span
          v-if="plan.monthlyEquivalent"
          class="text-theme-black/40 dark:text-theme-white/40 whitespace-nowrap"
          v-text="$t('plan_select_monthly_equivalent', { price: plan.monthlyEquivalent })"
        />
      </div>

      <input
        v-model="selectedKey"
        type="radio"
        name="plan"
        :value="plan.key"
        class="hidden"
      >
    </label>
  </div>
</template>

<script lang="ts" setup>
import type { PricingPagePromoPricing } from './PricingPageContent.props'
import { calcYearlyDiscountPercent } from '~/composables/use-subscription-pricing'
import { DEFAULT_TRIAL_PERIOD_DAYS, PAID_TRIAL_PRICE } from '~~/shared/constants/pricing'
import { resolveIsPaidTrial } from '~~/shared/utils/pricing'

const props = withDefaults(defineProps<{
  // Civic reuses this selector with its own prices and no trial (product decision).
  tier?: LikerPlusTier
  isYearlyHidden?: boolean
  isMonthlyHidden?: boolean
  isAllowYearlyTrial?: boolean
  trialPeriodDays?: number
  trialPrice?: number
  // Store-driven (IAP) trial overrides — see IAPTrialInfo in use-native-iap.ts.
  // `isPaidTrialOverride` forces the paid/free distinction instead of deriving it
  // from the day count; `trialPriceString` is shown verbatim for a store paid intro.
  isPaidTrialOverride?: boolean
  trialPriceString?: string
  // Store-driven (IAP) recurring price strings — see IAPPlanPrice in use-native-iap.ts.
  monthlyPriceString?: string
  yearlyPriceString?: string
  yearlyDescription?: string
  monthlyDescription?: string
  yearlyBadgeText?: string
  monthlyBadgeText?: string
  promoPricing?: PricingPagePromoPricing
  giftMonthQuantity?: number[]
  giftYearQuantity?: number[]
}>(), {
  tier: 'plus',
  isYearlyHidden: false,
  isMonthlyHidden: false,
  isAllowYearlyTrial: true,
  trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
  trialPrice: PAID_TRIAL_PRICE,
  isPaidTrialOverride: undefined,
  trialPriceString: undefined,
  monthlyPriceString: undefined,
  yearlyPriceString: undefined,
  yearlyDescription: undefined,
  monthlyDescription: undefined,
  yearlyBadgeText: undefined,
  monthlyBadgeText: undefined,
  promoPricing: undefined,
  giftMonthQuantity: () => [],
  giftYearQuantity: () => [],
})

const { t: $t } = useI18n()

const {
  monthlyPrice,
  yearlyPrice,
  civicMonthlyPrice,
  civicYearlyPrice,
  originalMonthlyPrice,
  originalYearlyPrice,
  yearlyDiscountPercent,
  hasMonthlyDiscount,
  hasYearlyDiscount,
  currency,
  convertToDisplayCurrency,
  getMonthsPrice,
} = useSubscriptionPricing()
const { formatConvertedPrice } = useCurrency()
const { getIAPPlanPrice } = useNativeIAP()

const selectedPlan = defineModel({
  type: String,
  default: 'yearly',
})
const selectedQuantity = defineModel('quantity', {
  type: Number,
  default: 1,
})

const selectedKey = computed({
  get: () => (selectedQuantity.value > 1
    ? `${selectedPlan.value}-${selectedQuantity.value}`
    : selectedPlan.value),
  set: (key: string) => {
    const [plan, quantity] = key.split('-')
    selectedPlan.value = plan as SubscriptionPlan
    selectedQuantity.value = quantity ? clampGiftQuantity(quantity) : 1
  },
})

const isCivic = computed(() => props.tier === 'civic')
const isGiftMode = computed(() => props.giftMonthQuantity.length > 0 || props.giftYearQuantity.length > 0)
// Civic has no trial, so its selector never shows trial pricing or hints.
const effectiveTrialPeriodDays = computed(() => (isCivic.value ? 0 : props.trialPeriodDays))
const civicYearlyDiscountPercent = computed(() =>
  calcYearlyDiscountPercent(civicMonthlyPrice.value, civicYearlyPrice.value))

const isPaidTrial = computed(() => resolveIsPaidTrial(
  effectiveTrialPeriodDays.value,
  isCivic.value ? false : props.isPaidTrialOverride,
))
const convertedTrialPrice = computed(() => convertToDisplayCurrency(props.trialPrice))
// An explicit store free trial (isPaidTrialOverride === false) must not show the
// "$X for N days" price hint — it's genuinely free.
const isFreeTrialOffer = computed(() => props.isPaidTrialOverride === false)

// The yearly "save X%" badge, hidden when there's no real saving (avoids "save 0%").
const yearlyDiscountBadge = computed(() => {
  const percent = isCivic.value ? civicYearlyDiscountPercent.value : yearlyDiscountPercent.value
  return percent > 0 ? $t('pricing_page_yearly_discount', { discount: percent }) : undefined
})

// A twelfth of the yearly price: a comparison figure, never a purchasable
// amount. Dropped unless it undercuts the real monthly plan, so a future price
// change can't leave the yearly option looking worse than it is.
function getMonthlyEquivalent(yearlyPrice: number, comparableMonthlyPrice: number) {
  const perMonth = yearlyPrice / 12
  if (perMonth >= comparableMonthlyPrice) return undefined
  return formatConvertedPrice(perMonth)
}

const plans = computed(() => {
  const values: { value: SubscriptionPlan, quantity: number }[] = []
  const yearQuantity = [...props.giftYearQuantity].filter(years => years > 1).sort((a, b) => b - a)
  yearQuantity.forEach((years) => {
    values.push({ value: 'yearly', quantity: years })
  })
  if (!props.isYearlyHidden) {
    values.push({ value: 'yearly', quantity: 1 })
  }
  [...props.giftMonthQuantity]
    .filter(months => months > 1)
    .sort((a, b) => b - a)
    .forEach((months) => {
      values.push({ value: 'monthly', quantity: months })
    })
  if (!props.isMonthlyHidden) {
    values.push({ value: 'monthly', quantity: 1 })
  }
  return values.map(({ value, quantity }) => {
    const key = quantity > 1 ? `${value}-${quantity}` : value

    if (quantity > 1) {
      const isYears = value === 'yearly'
      return {
        isSelected: selectedKey.value === key,
        key,
        label: isYears
          ? $t('pricing_page_n_years', { count: quantity })
          : $t('pricing_page_n_months', { count: quantity }),
        hint: undefined,
        badgeText: isYears ? (props.yearlyBadgeText ?? yearlyDiscountBadge.value) : undefined,
        perUnit: isYears
          ? $t('pricing_page_price_per_n_years', { count: quantity })
          : $t('pricing_page_price_per_n_months', { count: quantity }),
        price: isYears ? yearlyPrice.value * quantity : getMonthsPrice(quantity),
        priceString: undefined,
        originalPrice: 0,
        hasDiscount: false,
        promoPrice: undefined as number | undefined,
        showTrialPrice: false,
        monthlyEquivalent: undefined as string | undefined,
        promoFreeKey: '',
        promoAmountKey: '',
      }
    }

    const isMonthly = value === 'monthly'
    let hint: string | undefined
    if (!isPaidTrial.value && effectiveTrialPeriodDays.value && (isMonthly || props.isAllowYearlyTrial)) {
      hint = isFreeTrialOffer.value
        ? $t('plan_select_free_trial_hint', { days: effectiveTrialPeriodDays.value })
        : $t('plan_select_trial_for_price_hint', {
            days: effectiveTrialPeriodDays.value,
            currency: currency.value,
            price: convertToDisplayCurrency(props.trialPrice),
          })
    }

    const badgeText = isMonthly
      ? props.monthlyBadgeText
      : (props.yearlyBadgeText ?? yearlyDiscountBadge.value)

    // Civic is base-price only — no promo, discount, or trial pricing. priceString
    // (store IAP), when present, suppresses originalPrice/hasDiscount downstream.
    const tierPricing = isCivic.value
      ? {
          price: isMonthly ? civicMonthlyPrice.value : civicYearlyPrice.value,
          priceString: getIAPPlanPrice(value, 'civic')?.priceString,
          originalPrice: 0,
          hasDiscount: false,
          promoPrice: undefined as number | undefined,
        }
      : {
          price: isMonthly ? monthlyPrice.value : yearlyPrice.value,
          priceString: isMonthly ? props.monthlyPriceString : props.yearlyPriceString,
          originalPrice: isMonthly ? originalMonthlyPrice.value : originalYearlyPrice.value,
          hasDiscount: isMonthly ? hasMonthlyDiscount.value : hasYearlyDiscount.value,
          promoPrice: isMonthly ? props.promoPricing?.monthly?.price : props.promoPricing?.yearly?.price,
        }

    return {
      isSelected: selectedKey.value === key,
      key,
      label: isMonthly
        ? (props.monthlyDescription
          || (isGiftMode.value ? $t('pricing_page_n_months', { count: 1 }) : $t('pricing_page_monthly')))
        : (props.yearlyDescription
          || (isGiftMode.value ? $t('pricing_page_n_years', { count: 1 }) : $t('pricing_page_yearly'))),
      hint,
      badgeText,
      perUnit: isMonthly ? $t('pricing_page_price_per_month') : $t('pricing_page_price_per_year'),
      ...tierPricing,
      showTrialPrice: !isCivic.value && (isMonthly || props.isAllowYearlyTrial),
      // Skipped for a store price string (can't divide a formatted string) and
      // for a promo, whose headline price isn't the one being spread over months.
      monthlyEquivalent: !isMonthly && !tierPricing.priceString && tierPricing.promoPrice === undefined
        ? getMonthlyEquivalent(tierPricing.price, isCivic.value ? civicMonthlyPrice.value : monthlyPrice.value)
        : undefined,
      promoFreeKey: isMonthly
        ? 'pricing_page_promo_first_monthly_free'
        : 'pricing_page_promo_first_yearly_free',
      promoAmountKey: isMonthly
        ? 'pricing_page_promo_first_monthly_amount'
        : 'pricing_page_promo_first_yearly_amount',
    }
  })
})

const toggleOptions = computed(() => plans.value.map(p => ({ key: p.key, label: p.label })))
</script>
