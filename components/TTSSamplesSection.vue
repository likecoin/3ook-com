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
        :key="sample.id"
      >
        <UButton
          class="w-full justify-start text-left p-4 group focus:ring-2 focus:ring-theme-500 focus:ring-offset-2 rounded-xl cursor-pointer"
          variant="outline"
          size="md"
          :ui="{ base: 'gap-3 bg-white hover:bg-white hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-in-out' }"
          @click="handleSampleClick(sample)"
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
                name="i-material-symbols-play-arrow-rounded"
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
      </li>
    </ul>

    <footer
      class="mt-4 text-sm text-muted text-center"
      v-text="$t('tts_samples_section_footer')"
    />
  </UCard>
</template>

<script setup lang="ts">
const ttsSamples = useTTSSamples()
const activeTTSSampleNFTClassId = ref(ttsSamples.value[0]?.nftClassId || 'tts-sample')
const ttsPlayerModal = useTTSPlayerModal({ nftClassId: activeTTSSampleNFTClassId })

function handleSampleClick(sample: TTSSample) {
  useLogEvent('tts_sample_click', { sample: sample.id })
  activeTTSSampleNFTClassId.value = sample.nftClassId
  ttsPlayerModal.openPlayer({
    bookTitle: sample.title,
    bookAuthorName: '',
    bookLanguage: sample.language,
    nftClassId: sample.nftClassId,
    segments: sample.segments,
    chapterTitlesBySection: {},
    ttsIndex: 0,
    sectionIndex: 0,
    startIndex: 0,
    specificLanguageVoice: sample.languageVoice,
  })
}
</script>
