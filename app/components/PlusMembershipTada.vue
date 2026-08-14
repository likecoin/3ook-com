<template>
  <div
    class="size-24 perspective-midrange"
    :style="timingStyle"
  >
    <div
      class="relative size-full transform-3d transition-transform duration-(--plus-flip-duration) ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none"
      :class="{ 'rotate-y-180': isStampRevealed }"
    >
      <div class="absolute inset-0 flex items-center justify-center backface-hidden">
        <UIcon
          name="i-material-symbols-check-circle-rounded"
          class="size-full text-theme-cyan"
        />
      </div>

      <div class="absolute inset-0 flex items-center justify-center backface-hidden rotate-y-180">
        <UAvatar
          class="bg-white border border-muted size-24"
          :src="user?.avatar"
          :alt="user?.displayName || ''"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />

        <template v-if="isStampRevealed">
          <!-- Pushed out by the badge landing. -->
          <div class="plus-stamp-ring absolute inset-0 rounded-full ring-2 ring-theme-cyan pointer-events-none" />

          <!-- Resting placement matches AccountAvatarSection, and stays on this
               wrapper so the keyframes below own transform outright. -->
          <div class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4">
            <div class="plus-stamp-badge relative">
              <UserAvatarPlusBadge
                color="primary"
                :tier="likerPlusTier"
              />
              <!-- Clipped separately from the badge so the sweep stays inside the
                   pill without cropping its ring. -->
              <div class="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                <div class="plus-stamp-shimmer absolute inset-0" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Timing lives in JS so PLUS_TADA_TOTAL_MS can be imported by the page as its
// hold floor; the CSS below reads the durations via timingStyle on the root.
export const PLUS_FLIP_LEAD_MS = 600
export const PLUS_FLIP_DURATION_MS = 600
// The badge stamps only once the flip has passed edge-on and the avatar
// face is showing.
export const PLUS_STAMP_DELAY_MS = PLUS_FLIP_DURATION_MS / 2
export const PLUS_STAMP_DURATION_MS = 720
export const PLUS_STAMP_SHIMMER_DURATION_MS = 700
export const PLUS_TADA_TOTAL_MS = PLUS_FLIP_LEAD_MS
  + PLUS_STAMP_DELAY_MS
  + PLUS_STAMP_DURATION_MS
  + PLUS_STAMP_SHIMMER_DURATION_MS
</script>

<script setup lang="ts">
// Only the trigger is a prop: it carries the success page's route-query and
// tier-match logic, which this component cannot derive. Avatar and tier come
// from the same composables AccountAvatarSection reads.
const props = defineProps<{
  hasLanded?: boolean
}>()

const { user } = useUserSession()
const { likerPlusTier } = useSubscription()
const preferredMotion = usePreferredReducedMotion()

const timingStyle = {
  '--plus-flip-duration': `${PLUS_FLIP_DURATION_MS}ms`,
  '--plus-stamp-delay': `${PLUS_STAMP_DELAY_MS}ms`,
  '--plus-stamp-duration': `${PLUS_STAMP_DURATION_MS}ms`,
  '--plus-stamp-shimmer-duration': `${PLUS_STAMP_SHIMMER_DURATION_MS}ms`,
}

// The check face must be seen before the flip, even when the membership has
// already landed at mount, so the reveal trails the landing by a beat.
const isStampRevealed = ref(false)
watch(() => props.hasLanded, (value, _, onCleanup) => {
  // A flap back to false remounts the badge, replaying the stamp from zero.
  if (!value) {
    isStampRevealed.value = false
    return
  }
  // Reduced motion swaps the faces instantly, so the beat would read as lag.
  if (preferredMotion.value === 'reduce') {
    isStampRevealed.value = true
    return
  }
  const timer = setTimeout(() => {
    isStampRevealed.value = true
  }, PLUS_FLIP_LEAD_MS)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })
</script>

<style scoped>
/* Deliberately less restrained than the book animations in main.css:
   this one runs once per member, ever. */
@keyframes plus-stamp {
  from { opacity: 0; transform: translateY(-28px) rotate(-14deg) scale(2.4); }
  62% { opacity: 1; transform: translateY(0) rotate(2deg) scale(0.92); }
  to { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

/* Not gated on a state class: the stamp elements are mounted only once the
   reveal fires, so their presence is the state. */
.plus-stamp-badge {
  /* `both` keeps the badge hidden through the flip-reveal delay. */
  animation: plus-stamp var(--plus-stamp-duration) cubic-bezier(0.3, 0.1, 0.3, 1) both;
  animation-delay: var(--plus-stamp-delay);
}

@keyframes plus-stamp-ring {
  from { opacity: 0.8; transform: scale(0.94); }
  to { opacity: 0; transform: scale(1.22); }
}

.plus-stamp-ring {
  opacity: 0;
  animation: plus-stamp-ring 620ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  /* Fires on the 62% frame above, where the badge actually lands. A keyframe
     stop cannot read a custom property, so the two must be changed together. */
  animation-delay: calc(var(--plus-stamp-delay) + var(--plus-stamp-duration) * 0.62);
}

@keyframes plus-stamp-shimmer {
  from { opacity: 1; transform: translateX(-120%); }
  to { opacity: 1; transform: translateX(120%); }
}

.plus-stamp-shimmer {
  opacity: 0;
  /* Neutral white so the pass reads as light on either badge colour scheme. */
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.7) 50%, transparent 65%);
  animation: plus-stamp-shimmer var(--plus-stamp-shimmer-duration) ease-out forwards;
  animation-delay: calc(var(--plus-stamp-delay) + var(--plus-stamp-duration));
}

@media (prefers-reduced-motion: reduce) {
  /* The badge stays, at rest; the ring and sweep stay at their base opacity 0.
     The flip itself is disabled by motion-reduce:transition-none above. */
  .plus-stamp-badge,
  .plus-stamp-ring,
  .plus-stamp-shimmer {
    animation: none;
  }
}
</style>
