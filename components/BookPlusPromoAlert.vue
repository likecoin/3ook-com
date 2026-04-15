<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <UAlert
    :title="title"
    :description="description"
    icon="i-material-symbols-celebration-outline-rounded"
    color="secondary"
    variant="subtle"
    orientation="horizontal"
    :ui="{
      root: 'rounded-xl items-center gap-3',
      title: 'text-sm font-bold',
      description: 'text-xs',
      icon: 'size-5',
    }"
  />
</template>
