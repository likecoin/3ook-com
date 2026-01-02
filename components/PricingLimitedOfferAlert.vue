<template>
  <slot v-if="isHidden" />
  <div
    v-else
    v-gsap.from="{
      backgroundColor: 'transparent',
      padding: 0,
      duration: 0.5,
      delay: 0.5,
      ease: 'expo.out',
    }"
    class="bg-theme-cyan p-3"
  >
    <div
      v-gsap.from="{
        opacity: 0,
        y: '100%',
        height: 0,
        duration: 0.5,
        delay: 0.5,
        ease: 'elastic.out(1,0.5)',
        clearProps: 'all',
      }"
      :class="[
        'flex',
        'items-center',
        'justify-between',
        'gap-1',
        { 'mb-6 laptop:mb-8': !!$slots.default },
        'text-theme-black',
        '-skew-x-6',
      ]"
    >
      <div class="flex items-center gap-2">
        <UIcon
          v-gsap.from="{
            rotate: 12,
            duration: 0.5,
            delay: 1,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true,
          }"
          class="text-theme-black"
          name="i-material-symbols-celebration-outline-rounded"
          :size="32"
        />
        <span
          class="laptop:text-lg font-bold"
          v-text="$t('subscribe_plus_alert_limited_offer')"
        />
      </div>

      <i18n-t
        :class="[
          'inline-flex',
          'justify-end',
          'items-center',
          'flex-wrap',
          'gap-x-1',
          'text-lg laptop:text-xl',
          'text-right',
        ]"
        keypath="subscribe_plus_alert_trial_with_price_description"
        tag="span"
      >
        <template #days>
          <span
            class="text-2xl laptop:text-3xl font-bold"
            v-text="trialPeriodDays"
          />
        </template>
        <template #price>
          <span
            v-gsap.to="{
              scale: 1.05,
              duration: 1,
              delay: 1,
              ease: 'power1.inOut',
              repeat: -1,
              yoyo: true,
            }"
            :class="[
              'inline-block',
              '-my-4 laptop:-my-2',
              'p-2.5 laptop:p-4',
              'text-theme-black',
              'bg-contain',
              'bg-size-[100%_100%]',
            ]"
            :style="{ backgroundImage: `url(${brushCircle})` }"
          >
            <span
              class="laptop:text-xl font-semibold"
              v-text="`${currency} `"
            />
            <span
              class="text-2xl laptop:text-4xl font-bold"
              v-text="`$${price}`"
            />
          </span>
        </template>
      </i18n-t>
    </div>

    <slot />
  </div>
</template>

<script lang="ts" setup>
import brushCircle from '~/assets/images/brush-circle.png'
import { DEFAULT_TRIAL_PERIOD_DAYS, PAID_TRIAL_PRICE } from '~/constants/pricing'

const { currency } = useSubscriptionPricing()

withDefaults(
  defineProps<{
    isHidden?: boolean
    trialPeriodDays?: number
    price?: number
  }>(),
  {
    isHidden: false,
    trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
    price: PAID_TRIAL_PRICE,
  },
)
</script>
