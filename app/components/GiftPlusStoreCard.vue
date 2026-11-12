<template>
  <li class="flex flex-col justify-end text-sm text-muted">
    <NuxtLink
      :to="giftPlusRoute"
      :class="[
        'group',
        'flex flex-col items-center justify-center gap-3',
        'aspect-2/3',
        'p-4',
        'rounded-lg',
        'bg-theme-black',
        'text-theme-cyan',
        'shadow-lg',
      ]"
    >
      <UIcon
        class="size-12 transition-transform group-hover:scale-110"
        name="i-material-symbols-featured-seasonal-and-gifts-rounded"
      />
      <span
        class="text-center text-lg font-semibold text-white"
        v-text="periodLabel"
      />
    </NuxtLink>

    <div class="mt-2 min-h-[3.2lh]">
      <div
        class="laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="$t('store_gift_plus_card_title', { period: periodLabel })"
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
const { getGiftPrice } = useSubscriptionPricing()
const { formatConvertedPrice } = useCurrency()

const periodLabel = computed(() => (props.period === 'yearly'
  ? $t('pricing_page_n_years', { count: props.quantity })
  : $t('pricing_page_n_months', { count: props.quantity })))

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
