<template>
  <div class="flex flex-col min-h-svh pb-(--intercom-launcher-offset)">
    <slot />

    <AppFooter v-show="isFooterVisible" />

    <AppTabBar v-show="isTabBarVisible" />
  </div>
</template>

<script setup lang="ts">
defineProps({
  isFooterVisible: {
    type: Boolean,
    default: false,
  },
  isTabBarVisible: {
    type: Boolean,
    default: true,
  },
})
</script>
