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
    :color="theme === 'cyan' ? 'neutral' : 'secondary'"
    :variant="theme === 'cyan' ? 'soft' : 'subtle'"
    orientation="horizontal"
    :ui="{
      root: ['rounded-xl items-center gap-3', theme === 'cyan' ? 'bg-theme-cyan text-gray-600' : ''],
      title: ['text-sm font-bold', theme === 'cyan' ? 'text-gray-600' : ''],
      description: ['text-xs', theme === 'cyan' ? 'text-gray-600' : ''],
      icon: ['size-5', theme === 'cyan' ? 'text-gray-600' : ''],
    }"
  />
</template>
