<template>
  <div class="flex flex-col min-h-svh max-lg:pb-14 mb-safe">
    <slot />

    <AppFooter :class="{ 'max-laptop:hidden': !props.isFooterVisibleInMobile }" />

    <AppTabBar />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  isFooterVisibleInMobile: {
    type: Boolean,
    default: false,
  },
})
</script>
