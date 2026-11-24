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
    >
      <img
        class="absolute inset-0 size-full"
        :src="coverSrc"
        alt=""
        loading="lazy"
        decoding="async"
      >
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

    <!--
      Stand-ins for BookstoreItem's Plus member price row above the price
      and its rank row below, so the grid baselines line up.
    -->
    <div class="h-lh mt-[0.5lh]" />
    <div
      class="h-lh text-highlighted"
      v-text="formattedPrice"
    />
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
const { coverSrc } = useGiftPlusArtwork()

const isYearly = computed(() => props.period === 'yearly')
const periodLabel = computed(() => (isYearly.value
  ? $t('pricing_page_n_years', { count: props.quantity })
  : $t('pricing_page_n_months', { count: props.quantity })))
const title = computed(() => $t('store_gift_plus_card_title', { period: periodLabel.value }))
const unitLabel = computed(() => $t(isYearly.value
  ? 'store_gift_plus_card_unit_years'
  : 'store_gift_plus_card_unit_months'))

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
