<template>
  <UCard
    v-if="ttsSamples.length > 0"
    variant="subtle"
    :ui="{ root: 'rounded-xl' }"
  >
    <div class="flex items-center gap-1">
      <UIcon
        class="text-theme-cyan"
        name="i-material-symbols-sound-sensing"
        :size="24"
      />
      <h3
        class="text-lg font-semibold text-highlighted"
        v-text="$t('tts_samples_section_title')"
      />
    </div>

    <TTSSamplesGrid
      class="mt-4"
      :samples="ttsSamples"
      :playing-sample-id="isPlayingSample ? activeTTSSampleId : null"
      @sample-click="handleSampleClick"
    />

    <footer
      class="mt-4 text-sm text-muted text-center"
      v-text="$t('tts_samples_section_footer')"
    />

    <TTSSamplePlayerModal
      v-model:open="isPlayerModalOpen"
      :sample="activeTTSSample"
      :is-playing="isPlayingSample"
      :is-loading="isLoadingSample"
      :progress-percentage="sampleProgress"
      :current-segment-index="currentSegmentIndex"
      :longest-segment-text="longestSegmentText"
      @toggle-playback="handleToggleSamplePlayback"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'
import type { TTSSamplePlacement } from '~~/shared/constants/analytics'

const props = defineProps<{
  affiliateVoices?: AffiliateVoiceData[]
  affiliateLikerId?: string
  affiliateExclusiveBadgeText?: string
}>()

const { handleError } = useErrorHandler()

const isPlayerModalOpen = ref(false)

const VOICE_SAMPLE_PLACEMENT: TTSSamplePlacement = 'samples-card'

const {
  samples: ttsSamples,
  activeSample: activeTTSSample,
  activeSampleId: activeTTSSampleId,
  currentSegmentIndex,
  longestSegmentText,
  isPlaying: isPlayingSample,
  isLoading: isLoadingSample,
  progressPercentage: sampleProgress,
  play: playSample,
  stop: stopSample,
  togglePlayback: toggleSamplePlayback,
} = useTTSSamplesPlayer({
  onError: (error: unknown) => handleError(error),
  onEnd: () => {
    useLogTTSSample('play_complete', { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
    isPlayerModalOpen.value = false
  },
  affiliateVoices: () => props.affiliateVoices,
  affiliateLikerId: () => props.affiliateLikerId,
  affiliateExclusiveBadgeText: () => props.affiliateExclusiveBadgeText,
})

watch(isPlayerModalOpen, (open) => {
  if (open) return
  if (activeTTSSampleId.value) {
    useLogTTSSample('stop', { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
    stopSample()
  }
})

function handleToggleSamplePlayback() {
  useLogTTSSample(toggleSamplePlayback(), { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
}

function handleSampleClick(sample: { id: string, languageVoice: string }) {
  const sampleId = sample.id

  if (isPlayingSample.value && activeTTSSampleId.value === sampleId) {
    isPlayerModalOpen.value = false
    return
  }

  const playingSample = playSample(sampleId)
  isPlayerModalOpen.value = true

  useLogTTSSample('play', { sample: playingSample, placement: VOICE_SAMPLE_PLACEMENT })
}
</script>
