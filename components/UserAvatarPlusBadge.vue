<template>
  <UBadge
    :class="[
      'absolute left-1/2 -translate-x-1/2',
      verticalAlign === 'top' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2',
    ]"
    size="xs"
    :variant="isInverted ? 'solid' : 'outline'"
    :ui="{
      base: [
        'rounded-full',
        isInverted
          ? 'bg-theme-black dark:bg-theme-cyan text-theme-cyan dark:text-theme-black'
          : 'bg-theme-white dark:bg-theme-black',
        'font-bold',
      ],
    }"
  >
    PLUS
  </UBadge>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  isInverted?: boolean
  verticalAlign?: 'top' | 'bottom'
}>(), {
  isInverted: false,
  verticalAlign: 'bottom',
})
</script>
