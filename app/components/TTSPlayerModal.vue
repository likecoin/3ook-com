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
      <div class="relative flex flex-col h-full w-full">
        <!-- Header -->
        <header class="flex items-center justify-center gap-1.5 px-16 min-h-16">
          <h1
            class="text-highlighted font-semibold text-center truncate"
            v-text="bookTitle"
          />

          <UDropdownMenu
            v-if="offlineTTSMenuItems.length"
            class="absolute top-4 left-4"
            :items="offlineTTSMenuItems"
            :content="{ align: 'start' }"
          >
            <UButton
              :icon="offlineTTSButton.icon"
              :label="offlineTTSButton.progressLabel"
              :aria-label="$t('tts_offline_menu_button')"
              :color="offlineTTSButton.color"
              :loading="isExportingOfflineTTS"
              size="md"
              variant="ghost"
            />
          </UDropdownMenu>

          <UButton
            class="absolute top-4 right-4"
            icon="i-material-symbols-close-rounded"
            size="md"
            variant="ghost"
            color="neutral"
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
          <div
            ref="segmentsContainerElement"
            class="relative flex flex-col gap-4 items-start h-full pt-6 pb-48 overflow-y-auto hide-scrollbar text-lg laptop:text-2xl text-justify leading-normal"
          >
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

        <!-- Floating elements -->
        <div class="absolute inset-x-0 bottom-4 pb-safe px-4 flex flex-col items-center">
          <div
            v-if="shouldShowTrialChip"
            class="mb-3 bg-(--app-bg) rounded-full"
          >
            <TTSTrialUsageChip
              :minutes-remaining="trialMinutesRemaining"
              :is-exhausted="isTrialExhausted"
              @click="handleTrialChipClick"
            />
          </div>

          <!-- Controls -->
          <div class="flex flex-col gap-0.5 px-3 py-2 rounded-4xl bg-(--ui-bg)/80 backdrop-blur-sm ring-1 ring-default">
            <div
              v-if="ttsProgress"
              class="flex items-center justify-between px-2 pt-2 text-xs text-muted tabular-nums"
            >
              <span
                role="progressbar"
                :aria-label="$t('reader_tts_progress_label', { percentage: ttsProgress.percentage })"
                :aria-valuenow="ttsProgress.percentage"
                aria-valuemin="0"
                aria-valuemax="100"
                v-text="`${ttsProgress.percentage}%`"
              />
              <span
                role="timer"
                :aria-label="$t('reader_tts_time_remaining_label', { time: ttsProgress.timeRemaining })"
                v-text="`-${ttsProgress.timeRemaining}`"
              />
            </div>

            <div class="flex items-center justify-center gap-3">
              <BottomSlideover
                v-model:open="isVoiceOptionsSlideoverOpen"
                :title="$t('reader_voice_options_button')"
                :is-disabled="!!props.specificLanguageVoice"
                :show-close-button="false"
                body-class="max-h-[40vh] select-none"
              >
                <UTooltip :text="activeTTSLanguageVoiceLabel">
                  <div class="shrink-0 flex justify-center w-16">
                    <UButton
                      :class="[
                        'rounded-full select-none p-0',
                        { 'pointer-events-none': !!props.specificLanguageVoice },
                      ]"
                      :ui="{ leadingAvatar: 'size-10 ring-2 ring-theme-cyan' }"
                      :avatar="{ src: activeTTSLanguageVoiceAvatar }"
                      variant="outline"
                      color="neutral"
                    />
                  </div>
                </UTooltip>

                <template #body>
                  <div
                    v-if="!isBookEnglish && (user?.isLikerPlus || canStartSubscribeFlow) && !hasCustomVoice"
                    class="px-4 py-3 space-y-3 border-b border-b-muted"
                  >
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
                      @click="subscription.openPaywallModal({ utmSource: 'tts_custom_voice', checkoutPlacement: 'tts-custom-voice', redirectRoute: buildSubscribeRedirectRoute() })"
                    />
                  </div>

                  <div class="flex gap-2 items-center w-full">
                    <URadioGroup
                      v-model="selectedTTSLanguageVoice"
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

              <UButton
                class="rounded-full"
                :ui="{ leadingIcon: 'size-10' }"
                icon="i-material-symbols-skip-previous-rounded"
                variant="ghost"
                color="neutral"
                :disabled="!isTextToSpeechOn"
                @click="skipBackward"
              />
              <UButton
                v-if="isTextToSpeechPlaying || isTextToSpeechLoading"
                class="rounded-full"
                :ui="{ leadingIcon: 'size-10' }"
                icon="i-material-symbols-pause-rounded"
                :loading="isTextToSpeechLoading"
                variant="solid"
                @click="pauseTextToSpeech"
              />
              <UButton
                v-else
                class="rounded-full"
                :ui="{ leadingIcon: 'size-10' }"
                icon="i-material-symbols-play-arrow-rounded"
                variant="solid"
                @click="startTextToSpeech(currentTTSSegmentIndex)"
              />
              <UButton
                class="rounded-full"
                :ui="{ leadingIcon: 'size-10' }"
                icon="i-material-symbols-skip-next-rounded"
                variant="ghost"
                color="neutral"
                :disabled="!isTextToSpeechOn"
                @click="skipForward"
              />

              <UTooltip :text="$t('reader_rate_options_button')">
                <UButton
                  class="rounded-full w-16 h-10 select-none shrink-0 justify-center"
                  :label="getTTSPlaybackRateLabel"
                  size="md"
                  variant="ghost"
                  :ui="{ label: 'font-mono font-bold whitespace-nowrap' }"
                  @click="handleTTSPlaybackRateButton"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { TTSPlayerModalProps } from './TTSPlayerModal.props'
import { TTS_ERROR_NOT_ALLOWED } from '~/composables/use-text-to-speech'
import { encodeAffiliateVoiceId } from '~~/shared/utils/tts-sig'
import { estimateTTSMinutes } from '~~/shared/utils/tts-trial'

const { user, loggedIn: hasLoggedIn, fetch: refreshSession } = useUserSession()
const { hasDevicePlus } = useDevicePlusEntitlement()
const accountStore = useAccountStore()
const subscription = useSubscriptionModal()
const { isProcessingSubscription } = subscription
const { errorModal, handleError } = useErrorHandler()
const toast = useToast()
const baseModal = useBaseModal()
const { public: { isTestnet } } = useRuntimeConfig()

const { customVoice, hasCustomVoice, fetchCustomVoice } = useCustomVoice()
const {
  isLoaded: isTrialUsageLoaded,
  charactersUsed: trialCharactersUsed,
  charactersRemaining: trialCharactersRemaining,
  isExhausted: isTrialExhausted,
  limit: trialCharacterLimit,
} = useTTSTrialUsage()
const localeRoute = useLocaleRoute()
const route = useRoute()

function buildSubscribeRedirectRoute() {
  return {
    name: route.name,
    params: route.params,
    query: route.query,
    hash: route.hash,
  }
}

const emit = defineEmits<{
  close: []
  segmentChange: [segment: TTSSegment & { index: number, isResync?: boolean }]
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

const { fetchConfig: fetchPlusAffiliateConfig, voicesForBook } = usePlusAffiliate()

const {
  ownerWallet: bookOwnerWallet,
  ownerLikerId: bookOwnerLikerId,
  upsellVoices: bookOwnerUpsellVoices,
} = useBookOwnerAffiliate(() => props.nftClassId)

const plusAffiliateVoices = computed(() => voicesForBook(props.nftClassId, bookOwnerWallet))

const isLikerPlus = computed(() => !!user.value?.isLikerPlus)

const affiliateVoices = computed(() =>
  isLikerPlus.value ? plusAffiliateVoices.value : bookOwnerUpsellVoices.value,
)

const affiliateUpsellVoiceValues = computed(() => {
  if (isLikerPlus.value) return new Set<string>()
  return new Set(bookOwnerUpsellVoices.value.map(v => encodeAffiliateVoiceId(v.id)))
})

const { canStartSubscribeFlow } = useNativeIAP()
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
  consumeTrackChangeResync,
  cyclePlaybackRate,
  showOfflineModal,
  forceResume,
  buildTTSEventPayload,
  hasOfflineTTS,
  isOfflineTTSDownloadable,
  isOfflineTTSTooLarge,
  offlineTTSState,
  offlineTTSMissingCount,
  offlineTTSPendingBytes,
  isOfflineTTSEnabled,
  isDownloadingOfflineTTS,
  offlineTTSDownloadPercentage,
  downloadOfflineTTS,
  cancelOfflineTTSDownload,
  removeOfflineTTS,
  exportOfflineTTS,
} = useTextToSpeech({
  nftClassId: props.nftClassId,
  isLibraryBook: () => !!props.isLibraryBook,
  bookName: props.bookTitle,
  bookAuthorName: props.bookAuthorName,
  bookCoverSrc: props.bookCoverSrc,
  bookLanguage: props.bookLanguage,
  customVoice,
  affiliateVoices,
  onError: async (error: string | Event | MediaError) => {
    // Autoplay was blocked by the browser because the modal auto-started
    // without a user gesture (e.g. reloading the reader with ?tts=1). The
    // composable has already reset playback state — leave the modal open so
    // the play button is visible and the user can tap to resume.
    if (error === TTS_ERROR_NOT_ALLOWED) {
      return
    }
    const isAuthLikeError = (
      typeof error === 'string' && error === 'NotSupportedError'
    ) || (
      error instanceof MediaError && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
    )
    if (isAuthLikeError) {
      // <audio> collapses HTTP 401 / 402 / 403 into MEDIA_ERR_SRC_NOT_SUPPORTED,
      // so a stale cached `user` would misclassify a logged-out cookie state
      // as "non-Plus" and wrongly trigger the upsell. Refresh first.
      try {
        await refreshSession()
      }
      catch {
        // Tolerate refresh failure — fall through with cached state.
      }
      if (!hasLoggedIn.value) {
        handleSessionExpired()
        return
      }
      if (!user.value?.isLikerPlus) {
        // The device store already confirmed the purchase but the backend
        // webhook hasn't flipped the session flag yet — don't re-nag with the
        // paywall; show a transient notice while the session reconciles.
        if (hasDevicePlus.value) {
          handlePlusActivating()
          return
        }
        handleTrialExhausted('server_402')
        return
      }
      // Plus user → real media error, fall through.
    }
    if (error instanceof MediaError) {
      handleError(new Error(`MediaError ${formatTTSError(error)}`))
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
  onTrialExhausted: () => handleTrialExhausted('client_gate'),
})

function handleTrialExhausted(source: 'server_402' | 'client_gate') {
  const payload = buildTTSEventPayload({ source })
  stopTextToSpeech()
  useLogEvent('tts_trial_exhausted', payload)
  // Primary TTS→Plus conversion surface; only degrade to a notice when we
  // genuinely can't route the user into a subscribe flow.
  if (!canStartSubscribeFlow.value) {
    errorModal.open({
      title: $t('tts_free_trial_limit_error_title'),
      description: $t('tts_free_trial_limit_error_description_app'),
    })
    return
  }
  subscription.openPaywallModal({
    utmSource: 'epub_reader',
    utmCampaign: props.nftClassId,
    utmMedium: 'tts',
    checkoutPlacement: 'tts-trial-limit',
    redirectRoute: buildSubscribeRedirectRoute(),
  })
}

// Store purchase succeeded but the session's Plus flag hasn't caught up yet.
// Show a transient notice instead of the paywall while the background reconcile
// refreshes the session; the user can retry playback once it flips.
function handlePlusActivating() {
  stopTextToSpeech()
  errorModal.open({
    level: 'warning',
    title: $t('tts_plus_activating_title'),
    description: $t('tts_plus_activating_description'),
  })
}

function handleSessionExpired() {
  stopTextToSpeech()
  useLogEvent('tts_session_expired', buildTTSEventPayload())
  errorModal.open({
    level: 'warning',
    title: $t('tts_session_expired_title'),
    description: $t('tts_session_expired_description'),
    actions: [
      {
        label: $t('login_button'),
        color: 'primary' as const,
        onClick: () => {
          accountStore.login()
        },
      },
    ],
  })
}

const { isTTSPlaying } = useTTSPlayingState()
watch(isTextToSpeechPlaying, playing => isTTSPlaying.value = playing, { immediate: true })
onBeforeUnmount(() => {
  isTTSPlaying.value = false
})

// The route-watch in use-tts-player-modal.ts can race the reader page's
// unmount and leave this fullscreen modal covering /plus/checkout. Close
// explicitly when the subscription handoff begins.
watch(isProcessingSubscription, (isProcessing) => {
  if (isProcessing) handleModalClose()
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

const documentVisibility = useDocumentVisibility()

const segmentsContainerElement = useTemplateRef<HTMLElement>('segmentsContainerElement')

async function scrollToCurrentSegment(index: number) {
  await nextTick()
  const el = visibleSegmentElements.get(index)
  const container = segmentsContainerElement.value
  if (!el || !container) return
  // Skip re-animating a smooth scroll when the segment already sits within the
  // centered 60% band of the container — avoids per-sentence scroll churn for
  // consecutive segments in the same paragraph.
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const band = containerRect.height * 0.2
  if (
    elRect.top >= containerRect.top + band
    && elRect.bottom <= containerRect.bottom - band
  ) {
    return
  }
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

watch(currentTTSSegmentIndex, (newIndex: number) => {
  // Skip the smooth-scroll animation while the app/tab is backgrounded: it
  // produces no visible result but still costs layout/composite cycles that
  // iOS WebKit may service in the background during long listening sessions.
  // The visibility watch below re-centers on foreground to cover skipped advances.
  if (documentVisibility.value !== 'visible') return
  scrollToCurrentSegment(newIndex)
})

// Catch up on return to foreground: background segment advances skip the scroll
// above, so re-center on the current segment (which may have moved on, or stayed
// put if playback was paused while backgrounded) once we're visible again.
watch(documentVisibility, (state) => {
  if (state !== 'visible') return
  scrollToCurrentSegment(currentTTSSegmentIndex.value)
})

const hasStartedPlaying = ref(false)

watch(
  () => props.segments,
  (newSegments) => {
    setTTSSegments(newSegments)
    if (newSegments.length > 0 && !hasStartedPlaying.value) {
      hasStartedPlaying.value = true
      nextTick(() => startTextToSpeech(props.startIndex || 0))
    }
  },
  { immediate: true },
)

onMounted(() => {
  setTTSLanguageVoice(props.specificLanguageVoice)
  if (user.value) {
    fetchCustomVoice()
  }
  if (isLikerPlus.value) {
    fetchPlusAffiliateConfig()
  }
})

const OFFLINE_TTS_BUTTON_PRESETS = {
  downloading: {
    icon: 'i-material-symbols-stop-circle-outline-rounded',
    color: 'neutral',
  },
  partial: {
    icon: 'i-material-symbols-downloading-rounded',
    color: 'warning',
  },
  downloaded: {
    icon: 'i-material-symbols-offline-pin-rounded',
    color: 'primary',
  },
  idle: {
    icon: 'i-material-symbols-download-rounded',
    color: 'neutral',
  },
} as const

const offlineTTSButton = computed(() => ({
  ...OFFLINE_TTS_BUTTON_PRESETS[offlineTTSState.value],
  // The menu trigger grows a percentage while the loop runs, so progress
  // stays readable without opening the menu.
  progressLabel: isDownloadingOfflineTTS.value ? `${offlineTTSDownloadPercentage.value}%` : undefined,
}))

// Testnet only: a file leaving the app is the rights question that the
// cache-based offline path exists to sidestep. Needs the download first —
// this reads the cache, it never synthesises.
const shouldShowOfflineTTSExportButton = computed(() =>
  isTestnet && isOfflineTTSEnabled.value && hasOfflineTTS.value,
)

const isExportingOfflineTTS = ref(false)

async function handleOfflineTTSExportClick() {
  if (isExportingOfflineTTS.value) return
  isExportingOfflineTTS.value = true
  try {
    const result = await exportOfflineTTS()
    if (!result) {
      // The button only shows when a download is pinned, so nothing to read
      // means the cache was swept out from under it. Silence would read as a
      // dead button.
      toast.add({
        title: $t('tts_offline_export_empty_toast'),
        icon: 'i-material-symbols-warning-outline-rounded',
        color: 'warning',
      })
      return
    }
    // Base64 through the native bridge: a book is tens of megabytes, so this
    // is testnet-sized. Mainnet needs a URL handoff or chunking first.
    await saveAs(result.blob, result.filename)
    if (result.missing) {
      toast.add({
        title: $t('tts_offline_export_partial_toast', { missing: result.missing }),
        icon: 'i-material-symbols-warning-outline-rounded',
        color: 'warning',
      })
    }
  }
  catch (error) {
    handleError(error)
  }
  finally {
    isExportingOfflineTTS.value = false
  }
}

// A menu instead of icon-only buttons: the labels used to live in a tooltip,
// which reads as a clickable row but does nothing when tapped. A partial
// download offers both rows — resuming it and dropping it are both reasonable.
const offlineTTSMenuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = []
  const state = offlineTTSState.value
  if (isOfflineTTSDownloadable.value) {
    if (state === 'downloading') {
      items.push({
        label: $t('tts_offline_download_cancel_button'),
        icon: OFFLINE_TTS_BUTTON_PRESETS.downloading.icon,
        onSelect: cancelOfflineTTSDownload,
      })
    }
    else {
      if (state !== 'downloaded') {
        items.push({
          label: state === 'partial'
            ? $t('tts_offline_resume_button', { remaining: offlineTTSMissingCount.value })
            : $t('tts_offline_download_button'),
          icon: OFFLINE_TTS_BUTTON_PRESETS.idle.icon,
          onSelect: () => { void startOfflineTTSDownload() },
        })
      }
      if (state !== 'idle') {
        items.push({
          label: $t('tts_offline_remove_button'),
          icon: 'i-material-symbols-delete-outline-rounded',
          onSelect: () => { void confirmRemoveOfflineTTS() },
        })
      }
    }
  }
  if (shouldShowOfflineTTSExportButton.value) {
    items.push({
      label: $t('tts_offline_export_button'),
      icon: 'i-material-symbols-save-alt-rounded',
      loading: isExportingOfflineTTS.value,
      onSelect: () => { void handleOfflineTTSExportClick() },
    })
  }
  return items
})

async function confirmRemoveOfflineTTS() {
  const isConfirmed = await baseModal.open({
    title: $t('tts_offline_remove_confirm_title'),
    description: $t('tts_offline_remove_confirm_description'),
    actions: [
      { label: $t('common_delete'), color: 'error', result: true },
      { label: $t('common_cancel'), variant: 'outline', result: false },
    ],
  }).result
  // Re-checked after the await: a voice change while the dialog was open would
  // otherwise delete a different download than the one the user confirmed.
  if (!isConfirmed || !hasOfflineTTS.value) return
  await removeOfflineTTS()
}

async function startOfflineTTSDownload() {
  if (isOfflineTTSTooLarge.value) {
    toast.add({
      title: $t('tts_offline_download_too_large_toast'),
      icon: 'i-material-symbols-warning-outline-rounded',
      color: 'warning',
    })
    return
  }
  const isResume = offlineTTSState.value === 'partial'
  const pendingCount = offlineTTSMissingCount.value
  // A book runs to a thousand-odd segments fetched one at a time and closing the
  // player cancels the loop, so the size is worth saying before the minutes are
  // spent. Skipped when ordinary listening already cached everything and the run
  // only has to register the pin: there is no wait to warn about.
  if (pendingCount) {
    const isConfirmed = await baseModal.open({
      title: $t('tts_offline_download_confirm_title'),
      description: $t('tts_offline_download_confirm_description', {
        size: formatFileSize(offlineTTSPendingBytes.value),
        count: pendingCount,
      }),
      actions: [
        { label: $t('tts_offline_download_confirm_button'), result: true },
        { label: $t('common_cancel'), variant: 'outline', result: false },
      ],
    }).result
    if (!isConfirmed) return
  }

  const startedAt = Date.now()
  useLogEvent('tts_offline_download_start', buildTTSEventPayload({
    segment_count: props.segments.length,
    pending_count: pendingCount,
    is_resume: isResume,
  }))
  try {
    const result = await downloadOfflineTTS()
    if (!result) return
    const eventPayload = buildTTSEventPayload({
      completed_count: result.completed,
      failed_count: result.failed,
      total_bytes: result.bytes,
      duration_ms: Date.now() - startedAt,
    })
    // Cancels used to be silent, which left no way to see how many downloads
    // are abandoned mid-book or how long people wait before giving up.
    if (result.isCancelled) {
      useLogEvent('tts_offline_download_cancel', eventPayload)
      return
    }
    toast.add({
      title: result.failed
        ? $t('tts_offline_download_partial_toast', { failed: result.failed })
        : $t('tts_offline_download_complete_toast'),
      icon: 'i-material-symbols-offline-pin-rounded',
      color: result.failed ? 'warning' : 'success',
    })
    useLogEvent('tts_offline_download_complete', eventPayload)
  }
  catch (error) {
    handleError(error)
  }
}

const isVoiceOptionsSlideoverOpen = ref(false)

const selectedTTSLanguageVoice = computed({
  get: () => ttsLanguageVoice.value,
  set: (val: string) => {
    if (val && affiliateUpsellVoiceValues.value.has(val)) {
      const likerId = bookOwnerLikerId.value
      if (likerId) {
        navigateTo(localeRoute({
          name: 'member',
          query: { from: `@${likerId}` },
        }))
      }
      isVoiceOptionsSlideoverOpen.value = false
      return
    }
    if (val !== ttsLanguageVoice.value && (hasOfflineTTS.value || isDownloadingOfflineTTS.value)) {
      void confirmTTSVoiceSwitch(val)
      return
    }
    applyTTSLanguageVoice(val)
  },
})

function applyTTSLanguageVoice(languageVoice: string) {
  ttsLanguageVoice.value = languageVoice
  isVoiceOptionsSlideoverOpen.value = false
}

/**
 * Offline audio is keyed on voice: another voice streams from the network, and
 * switching mid-download cancels it. Asked rather than applied silently, since
 * listening without a connection is the reason the download exists.
 */
async function confirmTTSVoiceSwitch(languageVoice: string) {
  const voice = activeTTSLanguageVoiceLabel.value
  const isConfirmed = await baseModal.open({
    title: $t('tts_offline_voice_switch_title'),
    description: isDownloadingOfflineTTS.value
      ? $t('tts_offline_voice_switch_downloading_description', { voice })
      : $t('tts_offline_voice_switch_description', { voice }),
    actions: [
      { label: $t('tts_offline_voice_switch_confirm_button'), result: true },
      { label: $t('common_cancel'), variant: 'outline', result: false },
    ],
  }).result
  if (!isConfirmed) return
  applyTTSLanguageVoice(languageVoice)
}

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
  const active = 'text-default opacity-100 font-bold'
  const inactive = 'opacity-40 text-muted hover:opacity-90'

  return `${base} ${index === currentTTSSegmentIndex.value ? active : inactive}`
}

watch(currentTTSSegment, (newSegment: TTSSegment | undefined) => {
  if (newSegment) {
    emit('segmentChange', { index: currentTTSSegmentIndex.value, ...newSegment, isResync: consumeTrackChangeResync() })
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
  cyclePlaybackRate()
}

const shouldShowTrialChip = computed(() =>
  hasLoggedIn.value
  && !user.value?.isLikerPlus
  && isTrialUsageLoaded.value,
)

// Private voices (custom, affiliate) have no language prefix; fall back
// to the book's language so TTS pacing estimates stay reasonable.
const currentVoiceLanguage = computed(() => {
  const { language } = parseLanguageVoice(ttsLanguageVoice.value || '')
  if (language.includes('-')) return language
  return props.bookLanguage || 'zh-HK'
})

// Floor at 1 so the chip never reads "0 分鐘" in the sub-minute window
// before `isTrialExhausted` flips.
const trialMinutesRemaining = computed(() => Math.max(
  1,
  Math.round(estimateTTSMinutes(trialCharactersRemaining.value, currentVoiceLanguage.value)),
))

// Memoised on the segment list so the whole-book walk doesn't re-run as
// playback advances; the per-segment lookups below are then O(1).
const ttsCharOffsets = computed(() => getTTSCharOffsets(props.segments))

// Counted through the end of the current segment: the segment index stops at
// the last segment, so counting only what precedes it would strand the display
// short of 100% for the rest of the book.
const ttsProgress = computed(() => {
  const totalCharacters = ttsCharOffsets.value.at(-1) ?? 0
  if (!totalCharacters) return null
  const listenedCharacters = ttsCharOffsets.value[currentTTSSegmentIndex.value + 1] ?? totalCharacters
  // Safari stall recovery may have forced the rate below the user's choice.
  const secondsRemaining = estimateTTSMinutes(
    totalCharacters - listenedCharacters,
    currentVoiceLanguage.value,
  ) * 60 / effectivePlaybackRate.value
  return {
    percentage: Math.round(listenedCharacters / totalCharacters * 100),
    timeRemaining: formatTTSClock(secondsRemaining),
  }
})

function buildChipEventPayload() {
  return {
    nft_class_id: props.nftClassId,
    characters_used: trialCharactersUsed.value,
    chars_remaining: trialCharactersRemaining.value,
    trial_char_limit: trialCharacterLimit.value,
    is_exhausted: isTrialExhausted.value,
    voice_language: currentVoiceLanguage.value,
  }
}

const hasFiredChipImpression = ref(false)
watch(shouldShowTrialChip, (shown) => {
  if (shown && !hasFiredChipImpression.value) {
    hasFiredChipImpression.value = true
    useLogEvent('tts_trial_chip_impression', buildChipEventPayload())
  }
}, { immediate: true })

function handleTrialChipClick() {
  useLogEvent('tts_trial_chip_click', buildChipEventPayload())
  subscription.openPaywallModal({
    utmSource: 'epub_reader',
    utmCampaign: props.nftClassId,
    utmMedium: 'tts_chip',
    checkoutPlacement: 'tts-trial-chip',
    redirectRoute: buildSubscribeRedirectRoute(),
  })
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
