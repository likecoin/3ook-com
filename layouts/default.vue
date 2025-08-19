<template>
  <div class="flex flex-col min-h-svh max-lg:pb-14 mb-safe">
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
