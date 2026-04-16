<template>
  <div class="fixed inset-0 flex flex-col min-h-svh mb-safe outline outline-gray-400 bg-(--app-bg)">
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: {
    class: 'reader',
  },
})
</script>

<style>
.reader-enter-active {
  transition: transform 0.5s cubic-bezier(0.23,1,0.32,1);
}
.reader-leave-active {
  transition: transform 0.25s cubic-bezier(0.55,0.06,0.68,0.19);
}
.reader-enter-from {
  transform: translateY(100%);
}
.reader-leave-to {
  transform: translateX(100%);
}

html.reader:not(.intercom-visible) #intercom-container,
html.reader:not(.intercom-visible) .intercom-lightweight-app {
  /* Hide Intercom in reader unless explicitly shown (e.g. report-issue prefill) */
  display: none !important;
}
</style>
