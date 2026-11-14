<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 max-w-full',
      { 'flex-row-reverse': isLabelFirst },
      'text-secondary dark:text-theme-cyan',
      'leading-none whitespace-nowrap',
    ]"
  >
    <span
      :class="['shrink-0 font-bold', PRICE_SIZE_CLASSES[size]]"
      v-text="price"
    />
    <!-- On a card too narrow for both, the label gives way so the price stays whole. -->
    <span
      class="min-w-0 truncate px-1.5 py-0.5 rounded-full bg-theme-cyan/20 text-xs font-medium"
      :title="label"
      v-text="label"
    />
  </span>
</template>

<script setup lang="ts">
const PRICE_SIZE_CLASSES: Record<'xs' | 'sm' | 'base' | 'xl', string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  xl: 'text-xl',
}

const props = withDefaults(defineProps<{
  price: string
  // Non-NFT member prices go to yearly Plus and Civic only.
  isYearly?: boolean
  isLabelFirst?: boolean
  size?: 'xs' | 'sm' | 'base' | 'xl'
}>(), {
  isYearly: false,
  isLabelFirst: false,
  size: 'xs',
})

const { t: $t } = useI18n()
const label = computed(() => (
  props.isYearly ? $t('plus_price_chip_label_yearly') : $t('plus_price_chip_label')
))
</script>
