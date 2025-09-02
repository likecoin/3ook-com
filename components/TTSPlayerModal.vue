<template>
  <UModal
    :fullscreen="true"
    :ui="{ content: 'bg-white divide-none' }"
    @close="handleModalClose"
  >
    <template #content>
      <div class="flex flex-col h-full w-full max-w-[670px] mx-auto py-6 px-8 laptop:px-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="grow overflow-hidden">
            <h1
              class="text-center text-sm font-semibold text-gray-500 truncate"
              v-text="bookTitle"
            />
          </div>

          <UButton
            class="shrink-0"
            icon="i-material-symbols-close-rounded"
            size="md"
            variant="ghost"
            @click="handleModalClose"
          />
        </div>
        <h2
          v-if="sectionTitle"
          class="text-lg font-semibold text-gray-700 truncate text-center laptop:my-4"
          v-text="sectionTitle"
        />

        <!-- Book Cover -->
        <div class="flex justify-center mt-4 laptop:mt-8 laptop:mb-10 z-20">
          <BookCover
            class="w-[120px] tablet:w-[150px] shrink-0"
            :src="bookCoverSrc"
            :alt="bookTitle"
            :is-vertical-center="true"
            :has-shadow="false"
          />
        </div>

        <!-- Content -->
        <div class="relative flex-1 min-h-0">
          <div
            ref="scrollContainer"
            class="overflow-y-auto hide-scrollbar h-full relative"
            style="scroll-behavior: smooth;"
          >
            <ul class="flex flex-col gap-4 items-start py-6">
              <li
                v-for="item in visibleSegments"
                :key="item.id"
                :ref="(el) => setSegmentRef(el, item.index)"

                v-memo="[currentTTSSegmentIndex === item.index]"
                :class="getSegmentClass(item.index)"
                @click="skipToIndex(item.index)"
              >
                {{ item.text }}
              </li>
            </ul>
          </div>
          <div
            :class="[
              ...scrollIndicatorClasses,
              'top-0',
              'bg-gradient-to-b',
              { 'opacity-0': currentTTSSegmentIndex === 0 },
            ]"
          />
          <div
            :class="[
              ...scrollIndicatorClasses,
              'bottom-0',
              'bg-gradient-to-t',
              { 'opacity-0': currentTTSSegmentIndex === segments.length - 1 },
            ]"
          />
        </div>

        <!-- Controls -->
        <div class="px-4 py-2 pb-safe">
          <div class="flex items-center justify-center gap-6">
            <UButton
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-ic-round-skip-previous"
              variant="ghost"
              color="neutral"
              :disabled="!isTextToSpeechOn"
              @click="skipBackward"
            />
            <UButton
              v-if="isTextToSpeechPlaying"
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-line-md-pause"
              variant="ghost"
              color="neutral"
              @click="pauseTextToSpeech"
            />
            <UButton
              v-else
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-material-symbols-play-arrow-rounded"
              variant="ghost"
              color="neutral"
              @click="startTextToSpeech(currentTTSSegmentIndex)"
            />
            <UButton
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-ic-round-skip-next"
              variant="ghost"
              color="neutral"
              :disabled="!isTextToSpeechOn"
              @click="skipForward"
            />
          </div>

          <!-- Player Options -->
          <div class="mt-4 flex justify-center items-center gap-4">
            <BottomSlideover :title="$t('reader_voice_options_button')">
              <UButton
                :ui="{ leadingAvatar: 'size-8' }"
                :avatar="{ src: activeTTSLanguageVoiceAvatar }"
                :label="activeTTSLanguageVoiceLabel"
                class="rounded-full"
                size="lg"
                variant="soft"
              />

              <template #body>
                <div class="flex gap-2 items-center w-full">
                  <URadioGroup
                    v-model="ttsLanguageVoice"
                    :ui="{
                      item: '!rounded-none !items-center !border-none',
                    }"
                    class="w-full"
                    color="primary"
                    variant="table"
                    :default-value="ttsLanguageVoice"
                    :items="ttsLanguageVoiceOptionsWithAvatars"
                    indicator="end"
                  >
                    <template #label="{ item }">
                      <UAvatar
                        size="lg"
                        :src="item.avatar"
                      />
                      <span
                        class="ml-2"
                        v-text="item.label"
                      />
                    </template>
                  </URadioGroup>
                </div>
              </template>
            </BottomSlideover>

            <BottomSlideover :title="$t('reader_rate_options_button')">
              <UButton
                :ui="{ leadingIcon: 'size-8' }"
                icon="i-material-symbols-fast-forward-outline"
                :label="getTTSPlaybackRateLabel"
                class="rounded-full"
                size="lg"
                variant="soft"
              />

              <template #body>
                <div class="flex gap-2 items-center w-full">
                  <URadioGroup
                    v-model="ttsPlaybackRate"
                    :ui="{
                      item: '!rounded-none',
                    }"
                    class="w-full"
                    color="primary"
                    variant="table"
                    :default-value="ttsPlaybackRate"
                    :items="ttsPlaybackRateOptions"
                    indicator="end"
                  />
                </div>
              </template>
            </BottomSlideover>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TTSPlayerModalProps } from './TTSPlayerModal.props'

const { user } = useUserSession()
const subscription = useSubscription()
const { handleError } = useErrorHandler()

const emit = defineEmits<{
  open: []
  close: []
}>()

const props = withDefaults(
  defineProps<TTSPlayerModalProps>(),
  {
    bookTitle: '',
    bookCoverSrc: '',
    bookAuthorName: '',
    bookLanguage: '',
    sectionTitle: '',
    nftClassId: '',
    segments: () => [],
    chapterTitlesBySection: () => ({}),
    startIndex: 0,
  },
)

const scrollIndicatorClasses = [
  'absolute',

  'inset-x-0',

  'h-12',

  'from-white',
  'to-transparent',
  'pointer-events-none',
]

const BUFFER_SIZE = 10
const visibleSegmentElements = ref<HTMLElement[]>([])
const scrollContainer = ref<HTMLElement>()

const {
  ttsLanguageVoiceOptionsWithAvatars,
  ttsLanguageVoice,
  activeTTSLanguageVoiceAvatar,
  ttsPlaybackRateOptions,
  ttsPlaybackRate,
  isTextToSpeechOn,
  isTextToSpeechPlaying,
  currentTTSSegment,
  pauseTextToSpeech,
  startTextToSpeech,
  setTTSSegments,
  skipForward,
  skipToIndex,
  skipBackward,
  stopTextToSpeech,
  currentTTSSegmentIndex,
} = useTextToSpeech({
  nftClassId: props.nftClassId,
  bookName: props.bookTitle,
  bookAuthorName: props.bookAuthorName,
  bookCoverSrc: props.bookCoverSrc,
  bookLanguage: props.bookLanguage,
  onError: (error: string | Event | MediaError) => {
    if (error instanceof MediaError
      && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      && !user.value?.isLikerPlus) {
      stopTextToSpeech()
      subscription.openPaywallModal({
        utmSource: 'epub_reader',
        utmCampaign: props.nftClassId,
        utmMedium: 'tts',
      })
      return
    }
    handleError(error)
  },
})

const visibleSegments = computed(() => {
  const start = Math.max(currentTTSSegmentIndex.value - BUFFER_SIZE, 0)
  const end = Math.min(currentTTSSegmentIndex.value + BUFFER_SIZE, props.segments.length)
  return props.segments.slice(start, end).map((segment, index) => ({
    ...segment,
    index: start + index,
  }))
})

const activeTTSLanguageVoiceLabel = computed(() => {
  const voice = ttsLanguageVoice.value
  return (
    ttsLanguageVoiceOptionsWithAvatars.value.find(
      (option: { value: string, label: string }) => option.value === voice,
    )?.label || voice
  )
})

const sectionTitle = computed(() => {
  const currentSegment = props.segments[currentTTSSegmentIndex.value]
  if (currentSegment && props.chapterTitlesBySection) {
    return props.chapterTitlesBySection[currentSegment.sectionIndex] || ''
  }
  return ''
})

const getTTSPlaybackRateLabel = computed(() => {
  const rate = ttsPlaybackRate.value
  return ttsPlaybackRateOptions.value.find(option => option.value === rate)?.label || ''
})

watch(currentTTSSegmentIndex, async (newIndex: number) => {
  await nextTick()
  const el = visibleSegmentElements.value[newIndex]
  el?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
})

onMounted(() => {
  setTTSSegments(props.segments)
  startTextToSpeech(props.startIndex || 0)
})

function setSegmentRef(
  el: Element | ComponentPublicInstance | null,
  index: number,
) {
  {
    const htmlEl = el as ComponentPublicInstance
    if (htmlEl instanceof HTMLElement) {
      visibleSegmentElements.value[index] = htmlEl
    }
  }
}

function getSegmentClass(index: number) {
  const baseClasses = 'inline-block text-sm laptop:text-lg transition-opacity duration-300'
  const activeClasses = 'text-gray-700 opacity-100 font-bold'
  const inactiveClasses = 'opacity-40 text-gray-500'

  return `${baseClasses} ${index === currentTTSSegmentIndex.value ? activeClasses : inactiveClasses}`
}

watch(currentTTSSegment, (newSegment: TTSSegment | undefined) => {
  if (props.onSegmentChange && newSegment) {
    props.onSegmentChange({ index: currentTTSSegmentIndex.value, ...newSegment })
  }
})

function handleModalClose() {
  stopTextToSpeech()
  emit('close')
}
</script>
