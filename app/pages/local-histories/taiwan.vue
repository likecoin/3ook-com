<template>
  <LocalHistoriesRegionPage :config="TW_LOCAL_HISTORIES_CONFIG">
    <template #map-paths>
      <TaiwanMapPaths />
    </template>
  </LocalHistoriesRegionPage>
</template>

<script setup lang="ts">
import { TW_LOCAL_HISTORIES_CONFIG } from '~~/shared/constants/local-histories'
</script>
