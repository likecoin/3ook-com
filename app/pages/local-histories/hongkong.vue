<template>
  <LocalHistoriesRegionPage :config="HK_LOCAL_HISTORIES_CONFIG">
    <template #map-paths>
      <HKMapPaths />
    </template>
    <template #map-pins>
      <HKMapPins />
    </template>
  </LocalHistoriesRegionPage>
</template>

<script setup lang="ts">
import { HK_LOCAL_HISTORIES_CONFIG } from '~~/shared/constants/local-histories'

definePageMeta({
  colorMode: 'light',
})
</script>
