<template>
  <UBadge
    size="xs"
    variant="outline"
    :ui="{
      base: [
        // Use absolute font size to prevent it from being affected by system font size changes
        'text-[8px]',
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
}>(), {
  color: 'primary',
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
