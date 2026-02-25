<template>
  <div class="flex flex-col gap-2 laptop:gap-3">
    <label
      v-for="plan in plans"
      :key="plan.value"
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

      <div class="flex flex-col justify-center min-h-[52px] text-xs laptop:text-sm text-right">
        <div
          v-if="plan.hint"
          class="text-theme-black/60"
          v-text="plan.hint"
        />

        <span
          v-if="plan.hasDiscount"
          class="text-theme-black/60 after:content-['_']"
        >
          <span>{{ $t('pricing_page_original_price') }}&nbsp;</span>
          <span class="line-through">{{ currency }} ${{ plan.originalPrice }}</span>
        </span>

        <span class="font-bold whitespace-nowrap">
          <span>{{ currency }}&nbsp;</span>
          <span
            class="text-lg laptop:text-2xl"
            v-text="`$${plan.price}`"
          />
          <span>/{{ plan.perUnit }}</span>
        </span>
      </div>

      <input
        v-model="selectedPlan"
        type="radio"
        name="plan"
        :value="plan.value"
        class="hidden"
      >
    </label>
  </div>
</template>

<script lang="ts" setup>
import { DEFAULT_TRIAL_PERIOD_DAYS, PAID_TRIAL_PRICE, PAID_TRIAL_PERIOD_DAYS_THRESHOLD } from '~/constants/pricing'

const props = withDefaults(defineProps<{
  isYearlyHidden?: boolean
  isMonthlyHidden?: boolean
  isAllowYearlyTrial?: boolean
  trialPeriodDays?: number
  trialPrice?: number
  yearlyDescription?: string
  monthlyDescription?: string
  isLimitedOfferBadgeHidden?: boolean
}>(), {
  isYearlyHidden: false,
  isMonthlyHidden: false,
  isAllowYearlyTrial: true,
  trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
  trialPrice: PAID_TRIAL_PRICE,
  yearlyDescription: undefined,
  monthlyDescription: undefined,
  isLimitedOfferBadgeHidden: false,
})

const { t: $t } = useI18n()

const {
  monthlyPrice,
  yearlyPrice,
  originalMonthlyPrice,
  originalYearlyPrice,
  yearlyDiscountPercent,
  hasMonthlyDiscount,
  hasYearlyDiscount,
  currency,
} = useSubscriptionPricing()

const selectedPlan = defineModel({
  type: String,
  default: 'yearly',
})

const isPaidTrial = computed(() => props.trialPeriodDays && props.trialPeriodDays >= PAID_TRIAL_PERIOD_DAYS_THRESHOLD)

const plans = computed(() => {
  const values: SubscriptionPlan[] = []
  if (!props.isYearlyHidden) {
    values.push('yearly')
  }
  if (!props.isMonthlyHidden) {
    values.push('monthly')
  }
  return values.map((value) => {
    const isMonthly = value === 'monthly'
    let hint: string | undefined
    if (isPaidTrial.value && (isMonthly || props.isAllowYearlyTrial)) {
      hint = $t('plan_select_trial_for_price_hint', {
        days: props.trialPeriodDays,
        currency: currency.value,
        price: props.trialPrice,
      })
    }

    let badgeText: string | undefined
    if (!isMonthly) {
      badgeText = $t('pricing_page_yearly_discount', { discount: yearlyDiscountPercent.value })
    }
    else if (!props.isLimitedOfferBadgeHidden && !props.isAllowYearlyTrial && isPaidTrial.value) {
      badgeText = $t('subscribe_plus_alert_limited_offer')
    }

    return {
      isSelected: selectedPlan.value === value,
      value,
      label: isMonthly
        ? (props.monthlyDescription || $t('pricing_page_monthly'))
        : (props.yearlyDescription || $t('pricing_page_yearly')),
      hint,
      badgeText,
      perUnit: isMonthly ? $t('pricing_page_price_per_month') : $t('pricing_page_price_per_year'),
      price: isMonthly ? monthlyPrice.value : yearlyPrice.value,
      originalPrice: isMonthly ? originalMonthlyPrice.value : originalYearlyPrice.value,
      hasDiscount: isMonthly ? hasMonthlyDiscount.value : hasYearlyDiscount.value,
    }
  })
})
</script>
