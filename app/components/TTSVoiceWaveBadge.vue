<template>
  <div
    class="w-6 h-6 rounded-full bg-inverted ring-2 ring-(--ui-bg) shadow-md flex items-center justify-center gap-0.5"
    aria-hidden="true"
  >
    <span
      v-for="i in BAR_COUNT"
      :key="i"
      class="wave-bar w-0.5 rounded-full bg-theme-cyan"
      :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
    />
  </div>
</template>

<script setup lang="ts">
const BAR_COUNT = 3
</script>

<style scoped>
.wave-bar {
  height: 25%;
  animation: wave 0.9s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { height: 25%; }
  50% { height: 60%; }
}

@media (prefers-reduced-motion: reduce) {
  .wave-bar {
    animation: none;
    height: 45%;
  }
}
</style>
