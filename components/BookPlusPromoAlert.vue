<script setup lang="ts">
type AlertColor = 'secondary' | 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | undefined
type AlertVariant = 'subtle' | 'solid' | 'outline' | 'soft' | undefined

withDefaults(defineProps<{
  title: string
  description: string
  color?: AlertColor
  variant?: AlertVariant
}>(), {
  color: 'secondary',
  variant: 'subtle',
})
</script>

<template>
  <UAlert
    :title="title"
    :description="description"
    icon="i-material-symbols-celebration-outline-rounded"
    :color="color"
    :variant="variant"
    orientation="horizontal"
    :ui="{
      root: 'rounded-xl items-center gap-3',
      title: 'text-sm font-bold',
      description: 'text-xs',
      icon: 'size-5',
    }"
  />
</template>
