<template>
  <UCard
    v-if="ttsSamples.length > 0"
    variant="subtle"
    :ui="{ root: 'mt-8 rounded-2xl' }"
  >
    <div class="flex items-center gap-1">
      <UIcon
        class="text-[#50E3C2]"
        name="i-material-symbols-sound-sensing"
        :size="24"
      />
      <h3
        class="text-lg font-semibold text-gray-900"
        v-text="$t('tts_samples_section_title')"
      />
    </div>

    <ul class="flex flex-col gap-3 w-full flex-wrap mt-4">
      <li
        v-for="sample in ttsSamples"
        v-show="!isPlayingSample || activeTTSSampleId === sample.id"
        :key="sample.id"
        class="space-y-2"
      >
        <UButton
          :class="[
            'w-full',
            'justify-start',
            'p-4',
            'group',
            'text-left',
            { 'ring-[#50E3C2]': activeTTSSampleId === sample.id },
            'rounded-xl',
            'cursor-pointer',
          ]"
          variant="outline"
          size="md"
          :ui="{ base: 'gap-3 bg-white hover:bg-white hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-in-out' }"
          @click="handleSampleClick(sample.id)"
        >
          <template #leading>
            <div
              :class="[
                'flex',
                'items-center',
                'justify-center',
                'w-10',
                'h-10',
                'rounded-full',
                'bg-gray-100',
                'group-hover:bg-gray-200',
                'transition-colors',
                'duration-200',
                'flex-shrink-0',
              ]"
            >
              <UIcon
                :name="getPlayButtonIcon(sample.id)"
                class="text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                size="20"
              />
            </div>
          </template>

          <div class="flex flex-col gap-1 grow">
            <div
              class="font-medium text-gray-900 truncate group-hover:text-black transition-colors duration-200"
              v-text="sample.title"
            />
            <div
              v-if="sample.description"
              class="text-sm text-gray-500 truncate group-hover:text-gray-600 transition-colors duration-200"
              v-text="sample.description"
            />
          </div>

          <template #trailing>
            <img
              class="w-12 h-12 rounded-full ring-theme-500"
              :src="sample.avatarSrc"
              :alt="sample.description"
            >
          </template>
        </UButton>

        <UCard
          v-if="activeTTSSampleId === sample.id && isPlayingSample && currentSegmentText"
          class="text-sm font-medium text-gray-900 rounded-xl"
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
      </li>
    </ul>

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

function getPlayButtonIcon(sampleId: string) {
  return activeTTSSampleId.value === sampleId && isPlayingSample.value
    ? 'i-material-symbols-stop-rounded'
    : 'i-material-symbols-play-arrow-rounded'
}

function handleSampleClick(sampleId: string) {
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
