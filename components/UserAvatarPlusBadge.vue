<template>
  <UBadge
    :class="[
      'absolute left-1/2 -translate-x-1/2',
      verticalAlign === 'top' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2',
    ]"
    size="xs"
    variant="outline"
    :ui="{
      base: [
        'rounded-full',
        colorClass,
        'font-bold',
      ],
    }"
  >
    PLUS
  </UBadge>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  color?: 'primary' | 'secondary' | 'neutral'
  verticalAlign?: 'top' | 'bottom'
}>(), {
  color: 'primary',
  verticalAlign: 'bottom',
})

const colorClass = computed(() => {
  switch (props.color) {
    case 'secondary':
      return 'bg-theme-cyan text-theme-black ring-theme-black'
    case 'neutral':
      return 'bg-theme-white dark:bg-theme-black'
    default:
      return 'bg-theme-black text-theme-cyan'
  }
})
</script>
