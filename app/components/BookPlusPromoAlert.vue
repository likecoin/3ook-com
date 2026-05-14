<script setup lang="ts">
type AlertTheme = 'default' | 'cyan'

withDefaults(defineProps<{
  title: string
  description: string
  theme?: AlertTheme
}>(), {
  theme: 'default',
})
</script>

<template>
  <UAlert
    :title="title"
    :description="description"
    icon="i-material-symbols-celebration-outline-rounded"
    color="neutral"
    variant="soft"
    orientation="horizontal"
    :ui="{
      root: 'rounded-xl items-center gap-3 bg-theme-cyan text-gray-700',
      title: 'text-sm font-bold text-theme-black',
      description: 'text-xs text-gray-700',
      icon: 'size-5 text-gray-700',
    }"
  />
</template>
