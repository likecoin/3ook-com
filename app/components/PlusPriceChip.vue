<template>
  <span
    :class="[
      'inline-flex items-center gap-1 max-w-full',
      'rounded-full',
      'bg-theme-cyan/20',
      'text-green-500 dark:text-theme-cyan',
      'leading-none whitespace-nowrap',
      size === 'md' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs',
    ]"
  >
    <!-- On a card too narrow for both, the label gives way so the price stays whole. -->
    <span
      class="min-w-0 truncate font-medium"
      :title="label"
      v-text="label"
    />
    <span
      class="shrink-0 font-bold"
      v-text="price"
    />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  price: string
  // Non-NFT member prices go to yearly Plus and Civic only.
  isYearly?: boolean
  size?: 'sm' | 'md'
}>(), {
  isYearly: false,
  size: 'sm',
})

const { t: $t } = useI18n()
const label = computed(() => (
  props.isYearly ? $t('plus_price_chip_label_yearly') : $t('plus_price_chip_label')
))
</script>
