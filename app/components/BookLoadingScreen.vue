<template>
  <div
    class="flex flex-col justify-center items-center py-8 laptop:py-14"
    :class="{ 'has-book-arrived': props.hasArrived }"
  >
    <PillButton
      v-if="props.isBackToShelfButtonVisible"
      class="absolute top-[max(16px,env(safe-area-inset-top))] left-4 z-10"
      icon="i-material-symbols-arrow-back-rounded"
      :aria-label="props.backTo ? $t('reader_back_to_store_button') : $t('reader_back_to_shelf_button')"
      :to="backRoute"
    />
    <div
      class="relative max-w-[164px] w-full aspect-2/3 shrink-0 perspective-[1000px] transition-opacity duration-1000"
      :class="[
        props.bookCoverSrc ? 'opacity-100' : 'opacity-0 pointer-events-none',
        props.coverClass,
      ]"
    >
      <!-- Animated by .has-book-arrived and .book-open-leave-active in main.css -->
      <div
        data-book-cover
        class="w-full h-full"
      >
        <BookCover
          class="w-full h-full"
          :src="props.bookCoverSrc"
          :alt="props.bookName"
          :has-shadow="true"
          :is-vertical-center="true"
        >
          <template #overlay>
            <Transition
              name="fade"
              :duration="2000"
            >
              <div
                v-if="isPrintingAnimated"
                class="absolute inset-0 rounded-lg overflow-hidden"
              >
                <div
                  v-gsap.to.infinitely="scanLineGSAPState"
                  class="absolute inset-0"
                  :style="scanLineStyle"
                />
                <div
                  v-gsap.fromTo="fillGSAPState"
                  class="absolute inset-0"
                  :style="fillStyle"
                />
                <div
                  v-gsap.fromTo="revealGSAPState"
                  class="absolute inset-0"
                  :style="revealStyle"
                />
              </div>
            </Transition>
          </template>
        </BookCover>
      </div>
    </div>
    <span
      :class="[
        'h-[1em]',
        'mt-4',
        'text-[40px]',
      ]"
    >
      <UIcon
        v-if="props.icon"
        :name="props.icon"
      />
    </span>
    <span
      class="min-h-9 mt-1 text-xl font-bold leading-9 text-center"
      v-text="iconLabel"
    />

    <span
      class="text-sm laptop:text-base text-muted font-semibold text-center"
      v-text="props.bookName"
    />

    <!-- min-h matches the tallest footer state so swapping footer content doesn't shift the centered layout. -->
    <footer class="flex flex-col items-center gap-2 w-full min-h-22 mt-8 laptop:mt-14 px-4 text-center">
      <slot
        v-if="$slots.footer"
        name="footer"
      />
      <template v-else-if="!props.loadingProgress || props.loadingProgress < 100">
        <span
          class="text-muted text-[10px]"
          v-text="loadingLabel"
        />
        <UProgress
          class="mt-2 max-w-[160px]"
          size="sm"
          :value="props.loadingProgress"
        />
      </template>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps({
  bookCoverSrc: {
    type: String,
    default: '',
  },
  bookName: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: undefined,
  },
  iconLabel: {
    type: String,
    default: '',
  },
  loadingLabel: {
    type: String,
    default: 'Loading...',
  },
  loadingProgress: {
    type: Number,
    default: null,
  },
  isPrinting: {
    type: Boolean,
    default: false,
  },
  // Settles the cover into place once the book lands. Readers animate on leave
  // instead, so they never set this.
  hasArrived: {
    type: Boolean,
    default: false,
  },
  coverClass: {
    type: String,
    default: undefined,
  },
  isBackToShelfButtonVisible: {
    type: Boolean,
    default: false,
  },
  // Defaults to the shelf; preview readers pass the product page.
  backTo: {
    type: Object as PropType<RouteLocationRaw>,
    default: undefined,
  },
})

const localeRoute = useLocaleRoute()

const backRoute = computed(() => props.backTo ?? localeRoute({ name: 'shelf' }))

// Sweeps left to right, matching the rotateY axis of the arrival that follows,
// so the wait and the payoff read as one gesture.
const PRINTING_PERIOD_SECONDS = 1.6

// Neutral white so the sheen reads as light on any cover artwork.
// Tile width sets the band spacing; gradient stops set the band width.
const scanLineStyle = {
  background: 'linear-gradient(to right, transparent 37.5%, rgba(255, 255, 255, 0.4) 50%, transparent 62.5%)',
  backgroundSize: '80% 100%',
  transform: 'rotate(-35deg) scale(1.8)',
}

const fillStyle = {
  background: 'linear-gradient(to right, rgba(255, 255, 255, 0.4), transparent)',
}

const revealStyle = {
  background: 'rgba(255, 255, 255, 0.2)',
}

const preferredMotion = usePreferredReducedMotion()

// Gates the overlay's v-if, not just the tween config: v-gsap has no updated
// hook, so unmounting is the only thing that kills a running tween, and a CSS
// media query cannot override the inline styles GSAP writes.
const isPrintingAnimated = computed(() => props.isPrinting && preferredMotion.value !== 'reduce')

const scanLineGSAPState = computed(() => {
  if (!isPrintingAnimated.value) return null
  return {
    backgroundPosition: '200% 0%',
    duration: PRINTING_PERIOD_SECONDS,
    ease: 'none',
    startAt: { backgroundPosition: '-200% 0%' },
  }
})

// Yoyo round trip spans two scan sweeps, so the wash breathes at half tempo
// while staying in phase with the scan line.
const fillGSAPState = computed(() => {
  if (!isPrintingAnimated.value) return null
  return [
    { opacity: 0 },
    { opacity: 1, duration: PRINTING_PERIOD_SECONDS, repeat: -1, yoyo: true, ease: 'power1.inOut' },
  ]
})

const revealGSAPState = computed(() => {
  if (!isPrintingAnimated.value) return null
  return [
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0 0 0)', duration: PRINTING_PERIOD_SECONDS, repeat: -1, yoyo: true, ease: 'power1.inOut' },
  ]
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
