<template>
  <div
    class="flex items-center gap-1.5 text-xs text-muted"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
    :style="timingStyle"
  >
    <span class="relative size-4 shrink-0">
      <svg
        class="size-full -rotate-90 transition-opacity duration-150 motion-reduce:transition-none"
        :class="{ 'opacity-0': tickCount > 0 }"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="10"
          cy="10"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <circle
          class="reader-progress-ring-fill text-primary"
          cx="10"
          cy="10"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>

      <!-- Keyed on the count so a tick during a tick replays instead of stalling. -->
      <UIcon
        v-if="tickCount > 0"
        :key="tickCount"
        name="i-material-symbols-check-circle-rounded"
        class="reader-progress-tick absolute inset-0 size-full text-primary"
        aria-hidden="true"
      />
    </span>

    <span v-text="label" />
  </div>
</template>

<script lang="ts">
// Timing lives in JS so a page can sequence around it; the CSS below reads
// the durations via timingStyle on the root.
export const READER_PROGRESS_FILL_DURATION_MS = 400
export const READER_PROGRESS_TICK_DURATION_MS = 900

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<script setup lang="ts">
const props = defineProps<{
  /** Reading position as a fraction, 0 to 1. */
  progress: number
  /** Changes when the reader enters a new chapter; a forward change plays the tick. */
  chapterKey?: string
}>()

const preferredMotion = usePreferredReducedMotion()

const clampedProgress = computed(() => {
  if (!Number.isFinite(props.progress)) return 0
  return Math.min(Math.max(props.progress, 0), 1)
})
const percent = computed(() => Math.round(clampedProgress.value * 100))
const label = computed(() => `${percent.value}%`)
const dashOffset = computed(() => CIRCUMFERENCE * (1 - clampedProgress.value))

const timingStyle = {
  '--reader-progress-fill-duration': `${READER_PROGRESS_FILL_DURATION_MS}ms`,
  '--reader-progress-tick-duration': `${READER_PROGRESS_TICK_DURATION_MS}ms`,
}

// Non-zero while a tick is showing; each tick bumps it so the icon remounts.
const tickCount = ref(0)
let progressAtLastChapter = clampedProgress.value

watch(() => props.chapterKey, (chapterKey, previousChapterKey, onCleanup) => {
  // An empty key on either side is the book opening or a transient blank,
  // and stepping back or standing still is not completing a chapter.
  const hasCompletedChapter = !!chapterKey && !!previousChapterKey
    && clampedProgress.value > progressAtLastChapter
  progressAtLastChapter = clampedProgress.value
  if (!hasCompletedChapter || preferredMotion.value === 'reduce') return

  tickCount.value += 1
  const timer = setTimeout(() => {
    tickCount.value = 0
  }, READER_PROGRESS_TICK_DURATION_MS)
  onCleanup(() => clearTimeout(timer))
})
</script>

<style scoped>
/* Same curve as book-arrive: an object settling, not a snap. */
.reader-progress-ring-fill {
  transition: stroke-dashoffset var(--reader-progress-fill-duration) cubic-bezier(0.3, 0.1, 0.3, 1);
}

@keyframes reader-progress-tick {
  0% { transform: scale(0.6); opacity: 0; }
  40% { transform: scale(1.15); opacity: 1; }
  60% { transform: scale(1); }
  85% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

.reader-progress-tick {
  animation: reader-progress-tick var(--reader-progress-tick-duration) ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .reader-progress-ring-fill {
    transition: none;
  }
}
</style>
