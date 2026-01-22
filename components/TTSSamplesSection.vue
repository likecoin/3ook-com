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

    <div class="mt-4 space-y-3">
      <TTSVoiceSelector
        :icon="getPlayButtonIcon(activeTTSSampleId)"
        :selected-voice-id="activeTTSSampleId"
        @voice-click="handleSampleClick"
      />

      <UCard
        v-if="isPlayingSample && currentSegmentText"
        class="text-sm font-medium text-highlighted rounded-xl"
      >
        <div class="relative">
          <!-- Spacer for text -->
          <span
            class="opacity-0 pointer-events-none"
            v-text="longestSegmentText"
          />
          <Transition name="fade">
            <span
              :key="`segment-${currentSegmentIndex}`"
              class="absolute inset-0"
              v-text="currentSegmentText"
            />
          </Transition>
        </div>
      </UCard>
    </div>

    <footer
      class="mt-4 text-sm text-muted text-center"
      v-text="$t('tts_samples_section_footer')"
    />
  </UCard>
</template>

<script setup lang="ts">
const { handleError } = useErrorHandler()

const {
  samples: ttsSamples,
  activeSampleId: activeTTSSampleId,
  currentSegmentText,
  currentSegmentIndex,
  longestSegmentText,
  isPlaying: isPlayingSample,
  play: playSample,
  stop: stopSample,
} = useTTSSamplesPlayer({
  onError: (error: unknown) => handleError(error),
  onEnd: () => {
    useLogEvent('tts_sample_play_complete', { sample: activeTTSSampleId.value })
  },
})

function getPlayButtonIcon(sampleId: string | null) {
  return sampleId && activeTTSSampleId.value === sampleId && isPlayingSample.value
    ? 'i-material-symbols-stop-rounded'
    : 'i-material-symbols-play-arrow-rounded'
}

function handleSampleClick(sample: { id: string, languageVoice: string }) {
  const sampleId = sample.id
  useLogEvent('tts_sample_click', { sample: sampleId })

  if (activeTTSSampleId.value === sampleId && isPlayingSample.value) {
    useLogEvent('tts_sample_stop', { sample: activeTTSSampleId.value })
    stopSample()
    return
  }

  useLogEvent('tts_sample_play', { sample: sampleId })
  playSample(sampleId)
}
</script>
