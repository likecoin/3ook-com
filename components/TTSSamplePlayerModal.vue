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
      <div
        v-if="sample"
        class="relative py-12 tablet:py-24 text-base leading-relaxed"
      >
        <!-- Sizer -->
        <p
          class="invisible font-bold whitespace-pre-wrap"
          aria-hidden="true"
          v-text="longestSegmentText"
        />

        <div
          ref="segmentsContainerRef"
          class="absolute inset-0 overflow-hidden py-12 tablet:py-24 space-y-4"
        >
          <p
            v-for="(segment, index) in sample.segments"
            :key="segment.id"
            ref="segmentRefs"
            :class="getSegmentClass(index)"
            v-text="segment.text"
          />
        </div>

        <!-- Top & Bottom Fades -->
        <div
          class="absolute inset-x-0 top-0 h-12 tablet:h-24 bg-gradient-to-b from-(--ui-bg) to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div
          class="absolute inset-x-0 bottom-0 h-12 tablet:h-24 bg-gradient-to-t from-(--ui-bg) to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

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
const props = defineProps<{
  sample: TTSSample | null
  isPlaying: boolean
  currentSegmentIndex: number
  longestSegmentText: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const localeRoute = useLocaleRoute()

const segmentsContainerRef = ref<HTMLElement | null>(null)
const segmentRefs = ref<HTMLElement[]>([])

function getSegmentClass(index: number) {
  const base = 'transition-opacity duration-300 whitespace-pre-wrap'
  return index === props.currentSegmentIndex
    ? `${base} font-bold text-default opacity-100`
    : `${base} text-muted opacity-40`
}

function scrollSegmentIntoView(index: number) {
  const container = segmentsContainerRef.value
  const el = segmentRefs.value[index]
  if (!container || !el) return
  const targetTop = el.offsetTop - (container.clientHeight - el.clientHeight) / 2
  const maxScrollTop = container.scrollHeight - container.clientHeight
  const top = Math.min(maxScrollTop, Math.max(0, targetTop))
  container.scrollTo({ top, behavior: 'smooth' })
}

watch(
  () => [props.sample?.id, props.currentSegmentIndex] as const,
  () => {
    scrollSegmentIntoView(props.currentSegmentIndex)
  },
  { flush: 'post' },
)
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
