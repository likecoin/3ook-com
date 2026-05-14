<template>
  <div :class="{ 'font-semibold': isBold }">
    <span v-text="value" />
    <span v-if="currency">&nbsp;{{ currency }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  value?: string | number
  maximumFractionDigits?: number
  currency?: string
  isBold?: boolean
  isCompact?: boolean
}>(), {
  value: 0,
  maximumFractionDigits: 2,
  isBold: true,
  isCompact: false,
})

const config = useRuntimeConfig()

const currency = computed(() => {
  return props.currency !== undefined ? props.currency : config.public.likeCoinTokenSymbol
})

const value = computed(() => {
  let num = props.value
  if (typeof num !== 'number') {
    if (typeof num === 'string') {
      num = num.replace(/,/g, '')
    }
    num = Number(num)
  }
  if (Number.isNaN(num)) {
    return '-'
  }

  if (props.isCompact && num >= 10_000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
    })
    return formatter.format(num)
  }

  return num.toLocaleString(undefined, {
    maximumFractionDigits: props.maximumFractionDigits,
  })
})
</script>
