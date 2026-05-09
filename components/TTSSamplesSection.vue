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
      :sample="selectedSample"
      :is-playing="isPlayingSample"
      :current-segment-index="currentSegmentIndex"
      :longest-segment-text="longestSegmentText"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

const props = defineProps<{
  affiliateVoices?: AffiliateVoiceData[]
  affiliateLikerId?: string
  affiliateExclusiveBadgeText?: string
}>()

const { handleError } = useErrorHandler()

const isPlayerModalOpen = ref(false)
const selectedSample = ref<TTSSample | null>(null)

const {
  samples: ttsSamples,
  activeSampleId: activeTTSSampleId,
  currentSegmentIndex,
  longestSegmentText,
  isPlaying: isPlayingSample,
  play: playSample,
  stop: stopSample,
} = useTTSSamplesPlayer({
  onError: (error: unknown) => handleError(error),
  onEnd: () => {
    useLogEvent('tts_sample_play_complete', { sample: activeTTSSampleId.value })
    isPlayerModalOpen.value = false
  },
  affiliateVoices: () => props.affiliateVoices,
  affiliateLikerId: () => props.affiliateLikerId,
  affiliateExclusiveBadgeText: () => props.affiliateExclusiveBadgeText,
})

watch(isPlayerModalOpen, (open) => {
  if (open) return
  if (activeTTSSampleId.value) {
    useLogEvent('tts_sample_stop', { sample: activeTTSSampleId.value })
    stopSample()
  }
  selectedSample.value = null
})

function handleSampleClick(sample: { id: string, languageVoice: string }) {
  const sampleId = sample.id
  useLogEvent('tts_sample_click', { sample: sampleId })

  if (isPlayingSample.value && activeTTSSampleId.value === sampleId) {
    isPlayerModalOpen.value = false
    return
  }

  selectedSample.value = ttsSamples.value.find(s => s.id === sampleId) ?? null
  isPlayerModalOpen.value = true

  useLogEvent('tts_sample_play', { sample: sampleId })
  playSample(sampleId)
}
</script>
