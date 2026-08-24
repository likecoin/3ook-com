<template>
  <div
    class="w-6 h-6 rounded-full bg-inverted ring-2 ring-(--ui-bg) shadow-md flex items-center justify-center gap-0.5"
    aria-hidden="true"
  >
    <span
      v-for="i in BAR_COUNT"
      :key="`${i}-${isSpeaking}`"
      class="wave-bar w-0.5 rounded-full bg-theme-cyan"
      :style="{
        animationDelay: `${(i - 1) * 0.15}s`,
        animationIterationCount: isSpeaking ? 'infinite' : `${SETTLE_WAVE_COUNT}`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
// Waving forever without sound reads as broken, so a badge that is not
// speaking settles after a few waves. The bars are keyed on the prop so each
// flip restarts the wave instead of resuming a finished one.
withDefaults(defineProps<{ isSpeaking?: boolean }>(), { isSpeaking: false })

const BAR_COUNT = 3
const SETTLE_WAVE_COUNT = 3
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
