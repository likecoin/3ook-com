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

        <TTSVoiceWaveBadge
          v-if="isAudible"
          class="absolute -bottom-0.5 -right-0.5"
          is-speaking
        />
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

      <div
        v-if="sample"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-3">
          <!-- Not `:loading`: that disables the button, so a mid-playback
               rebuffer would take pause away until the audio recovers. -->
          <UButton
            class="rounded-full shrink-0"
            :ui="{ leadingIcon: isLoading ? 'size-7 animate-spin' : 'size-7' }"
            :icon="playbackButtonIcon"
            :aria-label="isPlaying ? $t('tts_sample_player_modal_pause_button') : $t('tts_sample_player_modal_play_button')"
            @click="emit('togglePlayback')"
          />

          <!-- A width-driven fill rather than UProgress:
               its indicator is a full-width bar positioned by a transform,
               which Chrome fails to clip to the rounded track. -->
          <div
            class="grow h-1 rounded-full bg-accented overflow-hidden"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="progressPercentage"
            :aria-label="getProgressLabel(progressPercentage)"
          >
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              :style="{ width: `${progressPercentage}%` }"
            />
          </div>
        </div>

        <!-- Kept in the layout while hidden so pausing doesn't resize the modal. -->
        <p
          class="flex items-center justify-center gap-1 text-xs text-dimmed"
          :class="{ invisible: !isAudible }"
        >
          <UIcon
            class="shrink-0"
            name="i-material-symbols-volume-up-outline-rounded"
          />
          <span v-text="$t('tts_sample_player_modal_volume_hint')" />
        </p>
      </div>

      <footer
        v-if="sample?.attribution || isPlusUpsellVisible"
        class="text-xs text-muted text-center space-y-1"
      >
        <p v-if="sample?.attribution">
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
        </p>
        <p
          v-if="isPlusUpsellVisible"
          v-text="$t('tts_sample_player_modal_plus_upsell')"
        />
      </footer>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  sample: TTSSample | null
  isPlaying: boolean
  isLoading: boolean
  progressPercentage: number
  currentSegmentIndex: number
  longestSegmentText: string
  // Ties the sample back to the Plus benefit that sent the viewer here.
  isPlusUpsellVisible?: boolean
}>()

const emit = defineEmits<{
  togglePlayback: []
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

// `play` fires before any audio arrives, so a cache-miss stall would otherwise
// animate the wave bars and prompt for volume while nothing is audible yet.
const isAudible = computed(() => props.isPlaying && !props.isLoading)

const playbackButtonIcon = computed(() => {
  if (props.isLoading) return 'i-material-symbols-progress-activity'
  return props.isPlaying
    ? 'i-material-symbols-pause-rounded'
    : 'i-material-symbols-play-arrow-rounded'
})

function getProgressLabel(percentage: number) {
  return $t('tts_sample_player_modal_progress_label', { percentage })
}

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
