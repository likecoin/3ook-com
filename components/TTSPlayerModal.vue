<template>
  <ErrorModal
    v-if="showOfflineModal"
    level="warning"
    :title="$t('tts_offline_modal_title')"
    :description="$t('tts_offline_modal_description')"
    :actions="offlineModalActions"
    @close="handleOfflineModalStop"
  />

  <UModal
    v-else
    :fullscreen="isFullscreen"
    :ui="{ content: 'bg-(--ui-bg) divide-none' }"
    @update:open="handleModalUpdateOpen"
  >
    <template #content>
      <div class="flex flex-col h-full w-full pb-4 sm:pb-6">
        <!-- Header -->
        <header class="flex items-center justify-center gap-1.5 px-16 min-h-16">
          <h1
            class="text-highlighted font-semibold text-center truncate"
            v-text="bookTitle"
          />

          <UButton
            class="absolute top-4 right-4"
            icon="i-material-symbols-close-rounded"
            size="md"
            variant="ghost"
            @click="handleModalClose"
          />
        </header>

        <!-- Book Cover -->
        <div
          v-if="bookCoverSrc"
          class="flex justify-center laptop:mt-8 laptop:mb-10 z-20"
        >
          <BookCover
            class="w-[120px] tablet:w-[150px] shrink-0"
            :src="bookCoverSrc"
            :alt="bookTitle"
            :is-vertical-center="true"
            :has-shadow="false"
          />
        </div>

        <h2
          v-if="sectionTitle"
          class="text-sm font-semibold text-muted truncate text-center my-4"
          v-text="sectionTitle"
        />

        <!-- Content -->
        <div class="relative flex-1 w-full max-w-[670px] min-h-0 mx-auto px-4 sm:px-6">
          <div class="relative flex flex-col gap-4 items-start h-full py-6 overflow-y-auto hide-scrollbar">
            <p
              v-for="paragraph in visibleParagraphs"
              :key="paragraph.key"
              v-memo="[paragraph.activeSegmentIndex, paragraph.segments.length]"
            >
              <span
                v-for="segment in paragraph.segments"
                :key="segment.id"
                :ref="(el) => setSegmentRef(el, segment.index)"
                :class="getSegmentClass(segment.index)"
                @click="skipToIndex(segment.index)"
              >{{ segment.text }} </span>
            </p>
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
              v-if="isTextToSpeechPlaying || isTextToSpeechLoading"
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-line-md-pause"
              :loading="isTextToSpeechLoading"
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
            <BottomSlideover
              :title="$t('reader_voice_options_button')"
              :is-disabled="!!props.specificLanguageVoice"
            >
              <UButton
                :class="[
                  'rounded-full',
                  { 'pointer-events-none': !!props.specificLanguageVoice },
                ]"
                :ui="{ leadingAvatar: 'size-8' }"
                :avatar="{ src: activeTTSLanguageVoiceAvatar }"
                :label="activeTTSLanguageVoiceLabel"
                size="lg"
                variant="soft"
              />

              <template #body>
                <div
                  v-if="!isBookEnglish && (user?.isLikerPlus || !isApp)"
                  class="px-4 py-3 space-y-3 border-b border-b-muted"
                >
                  <p
                    class="text-xs font-semibold text-muted uppercase tracking-wide"
                    v-text="$t('tts_custom_voice_section_title')"
                  />

                  <template v-if="!hasCustomVoice">
                    <UButton
                      v-if="user?.isLikerPlus"
                      block
                      variant="soft"
                      :label="$t('tts_custom_voice_upload_button')"
                      icon="i-material-symbols-upload-rounded"
                      @click="handleCustomVoiceUploadClick"
                    />
                    <UButton
                      v-else
                      block
                      variant="soft"
                      :label="$t('tts_custom_voice_upgrade_button')"
                      icon="i-material-symbols-lock-outline"
                      @click="subscription.openPaywallModal({ utmSource: 'tts_custom_voice' })"
                    />
                  </template>
                </div>

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

            <UTooltip :text="$t('reader_rate_options_button')">
              <UButton
                class="rounded-full w-18 h-12"
                :label="getTTSPlaybackRateLabel"
                size="lg"
                variant="soft"
                :ui="{ label: 'w-full font-mono font-bold' }"
                @click="handleTTSPlaybackRateButton"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TTSPlayerModalProps } from './TTSPlayerModal.props'

const { user } = useUserSession()
const subscription = useSubscriptionModal()
const { errorModal, handleError } = useErrorHandler()

const { customVoice, hasCustomVoice, isLoading: isCustomVoiceLoading, fetchCustomVoice } = useCustomVoice()
const localeRoute = useLocaleRoute()

const emit = defineEmits<{
  close: []
  segmentChange: [segment: TTSSegment & { index: number }]
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
    isAutoClose: false,
    isFullscreen: true,
  },
)

const { isApp } = useAppDetection()
const isDesktopScreen = useDesktopScreen()

const isFullscreen = computed(() => {
  return props.isFullscreen || !isDesktopScreen.value
})

const scrollIndicatorClasses = [
  'absolute',

  'inset-x-0',

  'h-12',

  'from-(--ui-bg)',
  'to-transparent',
  'pointer-events-none',
]

const BUFFER_SIZE = 3
const MAX_PARA_EXPANSION = 10
const visibleSegmentElements = new Map<number, HTMLElement>()

const {
  isBookEnglish,
  ttsLanguageVoiceOptionsWithAvatars,
  ttsLanguageVoice,
  setTTSLanguageVoice,
  activeTTSLanguageVoiceAvatar,
  activeTTSLanguageVoiceLabel,
  ttsPlaybackRateOptions,
  effectivePlaybackRate,
  isTextToSpeechOn,
  isTextToSpeechPlaying,
  currentTTSSegment,
  isTextToSpeechLoading,
  pauseTextToSpeech,
  startTextToSpeech,
  setTTSSegments,
  skipForward,
  skipToIndex,
  skipBackward,
  stopTextToSpeech,
  currentTTSSegmentIndex,
  cyclePlaybackRate,
  showOfflineModal,
  forceResume,
} = useTextToSpeech({
  nftClassId: props.nftClassId,
  bookName: props.bookTitle,
  bookAuthorName: props.bookAuthorName,
  bookCoverSrc: props.bookCoverSrc,
  bookLanguage: props.bookLanguage,
  customVoice,
  ttsCantoneseModel: useTTSCantoneseModel(),
  onError: (error: string | Event | MediaError) => {
    if (
      !user.value?.isLikerPlus
      && (
        (
          typeof error === 'string'
          && error === 'NotSupportedError'
        )
        || (
          error instanceof MediaError
          && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        )
      )
    ) {
      stopTextToSpeech()
      if (isApp.value) {
        errorModal.open({
          title: $t('tts_free_trial_limit_error_title'),
          description: $t('tts_free_trial_limit_error_description'),
        })
        return
      }
      subscription.openPaywallModal({
        utmSource: 'epub_reader',
        utmCampaign: props.nftClassId,
        utmMedium: 'tts',
      })
      return
    }
    if (error instanceof MediaError) {
      const codeNames: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED',
        2: 'MEDIA_ERR_NETWORK',
        3: 'MEDIA_ERR_DECODE',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
      }
      handleError(new Error(`MediaError ${codeNames[error.code] || error.code}: ${error.message}`))
      return
    }
    if (error instanceof Event) {
      handleError(new Error(`Audio error event: ${error.type}`))
      return
    }
    handleError(error)
  },
  onAllSegmentsPlayed: () => {
    if (props.isAutoClose) {
      handleModalClose()
    }
  },
})

const { isTTSPlaying } = useTTSPlayingState()
watch(isTextToSpeechPlaying, playing => isTTSPlaying.value = playing, { immediate: true })
onBeforeUnmount(() => {
  isTTSPlaying.value = false
})

interface VisibleParagraph {
  key: string
  segments: Array<TTSSegment & { index: number }>
  activeSegmentIndex: number | undefined
}

function sameParagraph(a: TTSSegment, b: TTSSegment): boolean {
  return a.elementIndex != null && a.elementIndex === b.elementIndex && a.sectionIndex === b.sectionIndex
}

const visibleParagraphs = computed<VisibleParagraph[]>(() => {
  const start = Math.max(currentTTSSegmentIndex.value - BUFFER_SIZE, 0)
  const end = Math.min(currentTTSSegmentIndex.value + BUFFER_SIZE, props.segments.length)

  // Extend start/end to include complete paragraphs
  let adjustedStart = start
  while (adjustedStart > 0 && (start - adjustedStart) < MAX_PARA_EXPANSION) {
    const prev = props.segments[adjustedStart - 1]
    const curr = props.segments[adjustedStart]
    if (prev && curr && sameParagraph(prev, curr)) {
      adjustedStart--
    }
    else { break }
  }
  let adjustedEnd = end
  while (adjustedEnd < props.segments.length && (adjustedEnd - end) < MAX_PARA_EXPANSION) {
    const prev = props.segments[adjustedEnd - 1]
    const curr = props.segments[adjustedEnd]
    if (prev && curr && sameParagraph(prev, curr)) {
      adjustedEnd++
    }
    else { break }
  }

  const paragraphs: VisibleParagraph[] = []
  let currentParagraph: VisibleParagraph | null = null

  for (let i = adjustedStart; i < adjustedEnd; i++) {
    const segment = props.segments[i]!
    const paragraphKey = segment.elementIndex != null
      ? `${segment.sectionIndex}-${segment.elementIndex}`
      : segment.id

    if (!currentParagraph || currentParagraph.key !== paragraphKey) {
      currentParagraph = { key: paragraphKey, segments: [], activeSegmentIndex: undefined }
      paragraphs.push(currentParagraph)
    }
    currentParagraph.segments.push({ ...segment, index: i })
    if (i === currentTTSSegmentIndex.value) {
      currentParagraph.activeSegmentIndex = i
    }
  }

  return paragraphs
})

const sectionTitle = computed(() => {
  const currentSegment = props.segments[currentTTSSegmentIndex.value]
  if (currentSegment && props.chapterTitlesBySection) {
    return props.chapterTitlesBySection[currentSegment.sectionIndex] || ''
  }
  return ''
})

const getTTSPlaybackRateLabel = computed(() => {
  const rate = effectivePlaybackRate.value
  return ttsPlaybackRateOptions.value.find(option => option.value === rate)?.label || `${rate}x`
})

const { t: $t } = useI18n()
const isResuming = ref(false)
const offlineModalActions = computed(() => [
  {
    label: $t('tts_offline_modal_resume_button'),
    color: 'primary' as const,
    onClick: () => {
      isResuming.value = true
      forceResume()
    },
  },
])

watch(currentTTSSegmentIndex, async (newIndex: number) => {
  await nextTick()
  const el = visibleSegmentElements.get(newIndex)
  el?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
})

const hasStartedPlaying = ref(false)

watch(
  () => props.segments,
  (newSegments) => {
    setTTSSegments(newSegments)
    if (newSegments.length > 0 && !hasStartedPlaying.value) {
      hasStartedPlaying.value = true
      startTextToSpeech(props.startIndex || 0)
    }
  },
  { immediate: true },
)

onMounted(() => {
  setTTSLanguageVoice(props.specificLanguageVoice)
  if (user.value && !customVoice.value && !isCustomVoiceLoading.value) {
    fetchCustomVoice()
  }
})

function setSegmentRef(
  el: Element | ComponentPublicInstance | null,
  index: number,
) {
  if (el instanceof HTMLElement) {
    visibleSegmentElements.set(index, el)
  }
  else if (el === null) {
    visibleSegmentElements.delete(index)
  }
}

function getSegmentClass(index: number) {
  const base = 'transition-opacity duration-300 cursor-pointer'
  const active = 'text-lg laptop:text-2xl text-(--ui-text) opacity-100 font-bold'
  const inactive = 'text-sm laptop:text-lg opacity-40 text-muted hover:opacity-90'

  return `${base} ${index === currentTTSSegmentIndex.value ? active : inactive}`
}

watch(currentTTSSegment, (newSegment: TTSSegment | undefined) => {
  if (newSegment) {
    emit('segmentChange', { index: currentTTSSegmentIndex.value, ...newSegment })
  }
})

function handleModalClose() {
  hasStartedPlaying.value = false
  stopTextToSpeech()
  emit('close')
}

function handleModalUpdateOpen(isOpen: boolean) {
  if (!isOpen) {
    handleModalClose()
  }
}

function handleCustomVoiceUploadClick() {
  handleModalClose()
  navigateTo(localeRoute({ name: 'account', query: { action: 'custom-voice' } }))
}

function handleTTSPlaybackRateButton() {
  const rate = cyclePlaybackRate()
  useLogEvent('tts_playback_rate_change', { rate })
}

function handleOfflineModalStop() {
  if (isResuming.value) {
    isResuming.value = false
    return
  }
  stopTextToSpeech()
  handleModalClose()
}
</script>
