<template>
  <NuxtLink
    :to="stakingRoute"
    :class="[
      'flex',
      'items-center',
      'justify-between',
      { 'opacity-0 pointer-events-none': isHidden },
    ]"
  >
    <span v-text="label" />

    <slot />
  </NuxtLink>
</template>

<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  label?: string
  isHidden?: boolean
  stakingRoute?: RouteLocationRaw
}>(), {
  label: '',
  isHidden: false,
})
</script>
