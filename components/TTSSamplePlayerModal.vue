<template>
  <UModal
    v-model:open="isOpen"
    :title="sample?.title ?? ''"
    :ui="{
      content: 'sm:max-w-md',
      title: 'flex items-center gap-3',
      body: 'flex flex-col gap-4',
    }"
  >
    <template
      v-if="sample"
      #title
    >
      <div class="relative shrink-0">
        <img
          class="w-14 h-14 rounded-full object-cover ring-1 ring-(--ui-border)"
          :src="sample.avatarSrc"
          :alt="sample.title"
        >

        <div
          v-if="isPlaying"
          class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-inverted ring-2 ring-(--ui-bg) shadow-md flex items-center justify-center gap-0.5"
          aria-hidden="true"
        >
          <span
            v-for="i in 3"
            :key="i"
            class="wave-bar w-0.5 rounded-full bg-theme-cyan"
            :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
          />
        </div>
      </div>

      <div class="flex flex-col text-left grow min-w-0">
        <span
          class="font-semibold text-highlighted truncate"
          v-text="sample.title"
        />
        <span
          v-if="sample.description"
          class="text-sm text-muted truncate"
          v-text="sample.description"
        />
      </div>
    </template>

    <template #body>
      <p class="relative text-base leading-relaxed text-highlighted min-h-32">
        <span
          class="opacity-0 pointer-events-none whitespace-pre-wrap"
          v-text="longestSegmentText"
        />
        <Transition name="fade">
          <span
            :key="`segment-${currentSegmentIndex}`"
            class="absolute inset-0 whitespace-pre-wrap"
            v-text="currentSegmentText"
          />
        </Transition>
      </p>

      <footer
        v-if="sample?.attribution"
        class="text-xs text-muted text-center"
      >
        <NuxtLink
          v-if="sample.attribution.nftClassId"
          :to="localeRoute({ name: 'store-nftClassId', params: { nftClassId: sample.attribution.nftClassId } })"
          class="underline hover:text-highlighted"
        >
          <span v-text="sample.attribution.text" />
        </NuxtLink>
        <span
          v-else
          v-text="sample.attribution.text"
        />
      </footer>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{
  sample: TTSSample | null
  isPlaying: boolean
  currentSegmentText: string
  currentSegmentIndex: number
  longestSegmentText: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const localeRoute = useLocaleRoute()
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
