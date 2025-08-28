<template>
  <div class="flex flex-col min-h-svh pb-17 mb-(--intercom-launcher-offset)">
    <slot />

    <AppFooter :class="{ hidden: !props.isFooterVisible }" />

    <AppTabBar />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  isFooterVisible: {
    type: Boolean,
    default: false,
  },
})
</script>
