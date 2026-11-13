<template>
  <li class="flex flex-col justify-end text-sm text-muted">
    <!-- The cover is sized in container units against the 177px Figma cover,
         so it holds at every grid column width. -->
    <NuxtLink
      :to="giftPlusRoute"
      :aria-label="title"
      :class="[
        'group',
        '@container relative overflow-hidden',
        'aspect-square',
        'rounded-lg',
        'bg-theme-black',
        'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]',
      ]"
      :style="{ '--glow-alpha': glow.alpha, '--glow-radius': glow.radius }"
    >
      <div class="gift-plus-glow absolute inset-0" />
      <span
        class="gift-plus-watermark absolute inset-x-0 top-[18.6cqw] text-center whitespace-nowrap font-black leading-none text-[42.9cqw] tracking-[-0.03em] select-none"
        aria-hidden="true"
      >Plus</span>
      <UIcon
        class="absolute left-[9cqw] top-[9cqw] size-[14.7cqw] text-theme-cyan transition-transform group-hover:scale-110"
        name="i-material-symbols-featured-seasonal-and-gifts-rounded"
      />
      <span
        v-if="isYearly && yearlyDiscountPercent > 0"
        class="absolute right-[8cqw] bottom-[9.6cqw] rounded-full bg-theme-black px-[4.5cqw] py-[1.7cqw] text-[6.8cqw] font-bold leading-[1.5] text-theme-cyan"
        v-text="$t('pricing_page_yearly_discount', { discount: yearlyDiscountPercent })"
      />
      <span class="absolute left-[9cqw] bottom-[6.8cqw] flex items-baseline gap-[2.3cqw] text-white">
        <span
          class="font-black leading-[0.95] text-[36.2cqw] tracking-[-0.04em]"
          v-text="quantity"
        />
        <span
          class="font-bold text-[9.6cqw]"
          v-text="unitLabel"
        />
      </span>
    </NuxtLink>

    <div class="mt-2 min-h-[3.2lh]">
      <div
        class="laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="title"
      />
      <div
        class="h-lh mt-[0.5lh] truncate leading-none text-xs text-toned"
        v-text="$t('store_gift_plus_card_description')"
      />
    </div>

    <div
      class="h-lh mt-[0.5lh] text-highlighted"
      v-text="formattedPrice"
    />
    <!-- Stand-in for BookstoreItem's rank row, so the grid baselines line up -->
    <div class="h-lh text-xs" />
  </li>
</template>

<script setup lang="ts">
const props = defineProps<{
  period: SubscriptionPlan
  quantity: number
  llMedium?: string
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { getGiftPrice, yearlyDiscountPercent } = useSubscriptionPricing()
const { formatConvertedPrice } = useCurrency()

const isYearly = computed(() => props.period === 'yearly')
const periodLabel = computed(() => (isYearly.value
  ? $t('pricing_page_n_years', { count: props.quantity })
  : $t('pricing_page_n_months', { count: props.quantity })))
const title = computed(() => $t('store_gift_plus_card_title', { period: periodLabel.value }))
const unitLabel = computed(() => $t(isYearly.value
  ? 'store_gift_plus_card_unit_years'
  : 'store_gift_plus_card_unit_months'))

// The mint glow grows with the gift length,
// so the cards read as one series while longer gifts look richer.
// One step per GIFT_PLUS_OPTIONS entry, shortest first; radius is in cqw.
const GLOW_STEPS = [
  { alpha: 0.16, radius: 70 },
  { alpha: 0.24, radius: 76 },
  { alpha: 0.32, radius: 80 },
  { alpha: 0.42, radius: 85 },
  { alpha: 0.55, radius: 89 },
] as const
const glow = computed(() => {
  const index = GIFT_PLUS_OPTIONS.findIndex(o => o.period === props.period && o.quantity === props.quantity)
  return GLOW_STEPS[Math.min(Math.max(index, 0), GLOW_STEPS.length - 1)]!
})

const formattedPrice = computed(() => formatConvertedPrice(getGiftPrice(props.period, props.quantity)))

const giftPlusRoute = computed(() => localeRoute({
  name: 'gift-plus',
  query: {
    period: props.period,
    quantity: props.quantity,
    ll_medium: props.llMedium || undefined,
  },
}))
</script>

<style scoped>
.gift-plus-glow {
  background: radial-gradient(
    circle calc(var(--glow-radius) * 1cqw) at 94% 94%,
    rgb(80 227 194 / var(--glow-alpha)),
    transparent
  );
}

/* A CSS stand-in for the Figma glass effect:
   a light-to-mint gradient clipped to the glyphs, lit along the top edge.
   No text stroke,
   since it traces the overlapping contours inside the system font's glyphs. */
.gift-plus-watermark {
  color: transparent;
  background-image: linear-gradient(
    165deg,
    rgb(255 255 255 / 0.10) 0%,
    rgb(255 255 255 / 0.03) 50%,
    rgb(80 227 194 / calc(var(--glow-alpha) * 0.6)) 100%
  );
  background-clip: text;
  text-shadow: 0 -1px 0 rgb(255 255 255 / 0.08);
}
</style>
