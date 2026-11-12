<template>
  <UButton
    :to="to"
    variant="link"
    color="neutral"
    :icon="isLibraryTab ? 'i-3ook-com-library-rounded' : undefined"
    :ui="{
      base: ['shrink-0', 'p-0 sm:p-0'],
      leadingIcon: ['size-8', 'text-highlighted'],
    }"
    :title="isLibraryTab ? $t('library_tab_title') : '3ook.com'"
    :aria-label="isLibraryTab ? $t('library_tab_title') : undefined"
  >
    <img
      v-if="!isLibraryTab"
      src="/logo.svg"
      alt="3ook.com"
      class="size-8 laptop:size-9 block"
    >
  </UButton>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  to?: RouteLocationRaw
  isLibraryTab: boolean
}>()
</script>
