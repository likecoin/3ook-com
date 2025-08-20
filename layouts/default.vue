<template>
  <div class="flex flex-col min-h-svh pb-14">
    <slot />

    <AppFooter :class="['mb-safe', { hidden: !props.isFooterVisible }]" />

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
