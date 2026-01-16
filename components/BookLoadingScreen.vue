<template>
  <div class="flex flex-col justify-center items-center py-[56px]">
    <div
      class="relative max-w-[164px] w-full aspect-2/3 mt-[8vh] shrink-0 transition-opacity duration-1000"
      :class="props.bookCoverSrc ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <BookCover
        class="w-full h-full"
        :src="props.bookCoverSrc"
        :alt="props.bookName"
        :has-shadow="true"
        :is-vertical-center="true"
      />
      <Transition
        name="fade"
        :duration="2000"
      >
        <div
          v-if="isPrinting"
          class="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
        >
          <div
            v-gsap.to.infinitely="scanLineGSAPState"
            class="absolute inset-0"
            :style="scanLineStyle"
          />
          <div
            v-gsap.fromTo.infinitely="fillGSAPState"
            class="absolute inset-0"
            :style="fillStyle"
          />
          <div
            v-gsap.fromTo.infinitely="revealGSAPState"
            class="absolute inset-0"
            :style="revealStyle"
          />
        </div>
      </Transition>
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

    <footer class="flex flex-col items-center w-full min-h-10 mt-[56px] px-4 text-center">
      <slot
        v-if="$slots.footer"
        class="mt-[56px]"
        name="footer"
      />
      <template v-else-if="!props.loadingProgress || props.loadingProgress < 100">
        <span
          class="text-gray-600 text-[10px]"
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
})

const scanLineStyle = {
  background: 'linear-gradient(to bottom, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)',
  backgroundSize: '100% 50%',
}

const fillStyle = {
  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.7), transparent)',
}

const revealStyle = {
  background: 'rgba(255, 255, 255, 0.3)',
}

const scanLineGSAPState = computed(() => {
  if (!props.isPrinting) return null
  return {
    backgroundPosition: '0% 200%',
    duration: 2,
    ease: 'none',
    startAt: { backgroundPosition: '0% -100%' },
  }
})

const fillGSAPState = computed(() => {
  if (!props.isPrinting) return null
  return [
    { opacity: 0 },
    { opacity: 1, duration: 3, yoyo: true, ease: 'power1.inOut' },
  ]
})

const revealGSAPState = computed(() => {
  if (!props.isPrinting) return null
  return [
    { clipPath: 'inset(100% 0 0 0)' },
    { clipPath: 'inset(0% 0 0 0)', duration: 4, yoyo: true, ease: 'power1.inOut' },
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
