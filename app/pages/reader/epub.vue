<template>
  <main>
    <Transition name="reader-load">
      <BookLoadingScreen
        v-if="isReaderLoading"
        class="absolute inset-0"
        cover-class="mt-[8vh]"
        is-back-to-shelf-button-visible
        :back-to="backRoute"
        :book-name="bookInfo.name.value"
        :book-cover-src="bookCoverSrc"
        :loading-label="loadingLabel"
        :loading-progress="loadingPercentage"
      />
    </Transition>
    <div
      class="relative flex flex-col w-full grow transition-opacity ease-out duration-[600ms] delay-[400ms]"
      :class="{ 'opacity-0 pointer-events-none': isReaderLoading }"
      :aria-hidden="isReaderLoading"
    >
      <ReaderHeader
        :book-name="bookInfo.name.value"
        :chapter-title="activeNavItemLabel"
        :is-preview="isPreviewMode"
        :back-to="backRoute"
      >
        <template #trailing>
          <div class="relative flex justify-end items-center gap-2">
            <BottomSlideover
              :title="$t('reader_display_options_button')"
              body-class="max-h-[40vh] select-none"
            >
              <UButton
                icon="i-material-symbols-text-fields-rounded"
                variant="ghost"
                color="neutral"
              />

              <template #body>
                <div class="flex flex-col laptop:flex-row gap-4 p-6 pt-4 justify-between">
                  <div class="flex-1">
                    <p
                      class="block text-sm font-medium mb-2"
                      v-text="$t('reader_display_font_size_label')"
                    />
                    <div class="flex gap-2 items-center">
                      <UButton
                        icon="i-material-symbols-text-decrease-outline-rounded"
                        variant="ghost"
                        @click="decreaseFontSize"
                      />
                      <USelect
                        v-model="fontSize"
                        class="pl-9 w-full"
                        :items="FONT_SIZE_OPTIONS"
                        :ui="{ value: 'mx-auto' }"
                      />
                      <UButton
                        icon="i-material-symbols-text-increase-rounded"
                        variant="ghost"
                        @click="increaseFontSize"
                      />
                    </div>
                  </div>
                  <div class="flex-1">
                    <p
                      class="block text-sm font-medium mb-2"
                      v-text="$t('reader_display_line_height_label')"
                    />
                    <div class="flex gap-2 items-center">
                      <UButton
                        icon="i-material-symbols-remove"
                        variant="ghost"
                        @click="decreaseLineHeight"
                      />
                      <div
                        class="flex justify-center items-center w-full px-2.5 py-1.5 text-sm rounded-md ring-2 ring-theme-black dark:ring-muted ring-inset"
                        v-text="lineHeight.toFixed(1)"
                      />
                      <UButton
                        icon="i-material-symbols-add"
                        variant="ghost"
                        @click="increaseLineHeight"
                      />
                    </div>
                  </div>
                  <div class="flex-1">
                    <p
                      class="block text-sm font-medium mb-2"
                      v-text="$t('reader_display_orientation_label')"
                    />
                    <div class="grid grid-cols-2 gap-2">
                      <UButton
                        :variant="writingMode === EPUB_WRITING_MODES.horizontal ? 'solid' : 'outline'"
                        icon="i-material-symbols-text-rotation-none-rounded"
                        class="w-full justify-center"
                        @click="setWritingMode(EPUB_WRITING_MODES.horizontal)"
                      />
                      <UButton
                        :variant="writingMode === EPUB_WRITING_MODES.vertical ? 'solid' : 'outline'"
                        icon="i-material-symbols-text-rotate-vertical-rounded"
                        class="w-full justify-center"
                        @click="setWritingMode(EPUB_WRITING_MODES.vertical)"
                      />
                    </div>
                  </div>
                </div>
                <div class="px-6 pb-6">
                  <UButton
                    class="w-full justify-center"
                    variant="outline"
                    :label="$t('reader_display_restore_defaults_button')"
                    @click="restoreDefaultDisplayOptions"
                  />
                </div>
              </template>
            </BottomSlideover>
            <ReaderLeftSidebar
              v-model:open="isLeftSidebarOpen"
              v-model:tab="leftSidebarTab"
              has-annotations
              :disabled="isReaderLoading"
              @trigger-click="handleLeftSidebarTriggerClick"
            >
              <template #toc>
                <p
                  v-if="!navItems.length"
                  class="text-muted py-8 text-center"
                  v-text="$t('reader_toc_empty')"
                />
                <ul
                  v-else
                  class="divide-muted divide-y"
                >
                  <li
                    v-for="item in navItems"
                    :ref="item.href === activeNavItemHref ? 'activeNavItemElements' : undefined"
                    :key="item.href"
                  >
                    <UButton
                      :label="item.label"
                      variant="link"
                      :color="item.href === activeNavItemHref ? 'primary' : 'neutral'"
                      :ui="{
                        label: 'text-left leading-[44px]',
                        base: 'justify-start pl-6 pr-5.5 py-0',
                      }"
                      :trailing-icon="item.href === activeNavItemHref ? 'i-material-symbols-visibility-rounded' : undefined"
                      block
                      @click="() => {
                        isLeftSidebarOpen = false
                        setActiveNavItem(item)
                      }"
                    />
                  </li>
                </ul>
              </template>

              <template #bookmarks>
                <BookmarksList
                  :items="bookmarks"
                  @navigate="handleBookmarkNavigate"
                  @delete="handleBookmarkDelete"
                />
              </template>

              <template #annotations>
                <AnnotationsList
                  :items="annotations"
                  @navigate="handleAnnotationNavigate"
                />
              </template>
            </ReaderLeftSidebar>
            <ReaderSearch
              ref="readerSearch"
              v-model:open="isSearchOpen"
              :search-handler="handleSearchEPUB"
              @navigate="handleSearchNavigate"
            />
            <UButton
              :aria-label="$t('reader_bookmark_button')"
              :icon="isCurrentPageBookmarked ? 'i-material-symbols-bookmark-rounded' : 'i-material-symbols-bookmark-outline-rounded'"
              :disabled="isReaderLoading || !currentBookmarkCfi"
              variant="ghost"
              :color="isCurrentPageBookmarked ? 'primary' : 'neutral'"
              @click="handleBookmarkToggle"
            />
            <UButton
              :class="[
                'laptop:hidden',
                { 'opacity-50 cursor-not-allowed': isReaderLoading || bookInfo.isAudioHidden.value },
              ]"
              icon="i-material-symbols-play-arrow-rounded"
              variant="solid"
              color="primary"
              :loading="isTTSExtracting"
              :ui="ttsButtonUI"
              @click="handleMobileTTSClick"
            />
            <UTooltip
              :disabled="!bookInfo.isAudioHidden.value"
              :text="$t('reader_text_to_speech_button_disabled_tooltip')"
            >
              <UButton
                class="max-laptop:hidden"
                icon="i-material-symbols-play-arrow-rounded"
                :aria-label="$t('reader_text_to_speech_button')"
                variant="solid"
                color="primary"
                :loading="isTTSExtracting"
                :disabled="isReaderLoading || bookInfo.isAudioHidden.value"
                :ui="ttsButtonUI"
                @click="onClickTTSPlay"
              />
            </UTooltip>
          </div>
        </template>
      </ReaderHeader>

      <div class="relative flex grow gap-4">
        <div class="relative w-full flex flex-col grow laptop:pt-6 pb-[64px]">
          <div class="relative grow w-full flex items-center">
            <div
              v-if="!isReaderLoading"
              :class="[
                'hidden md:flex',
                'items-center',
                'justify-center',
                'flex-1',
                'h-full',
                'cursor-pointer',
                { 'opacity-0 pointer-events-none': shouldFlipFromRightToLeft ? isAtLastPage : isAtFirstPage },
              ]"
              @click="handleLeftArrowButtonClick"
            >
              <UIcon
                size="24"
                name="i-material-symbols-arrow-back-ios-new-rounded"
              />
            </div>

            <div class="relative w-full max-w-[768px] h-full mx-auto">
              <div
                ref="reader"
                class="absolute inset-0"
              />
            </div>

            <div
              v-if="!isReaderLoading"
              :class="[
                'hidden md:flex',
                'items-center',
                'justify-center',
                'flex-1',
                'h-full',
                'cursor-pointer',
                { 'opacity-0 pointer-events-none': shouldFlipFromRightToLeft ? isAtFirstPage : isAtLastPage },
              ]"
              @click="handleRightArrowButtonClick"
            >
              <UIcon
                size="24"
                name="i-material-symbols-arrow-forward-ios-rounded"
              />
            </div>
          </div>

          <div
            v-if="!isReaderLoading"
            :class="[
              'absolute',
              'inset-0',
              'flex',
              'items-center',
              'justify-center',
              'bg-accented/75',
              isPageLoading ? 'opacity-100' : 'opacity-0',
              'pointer-events-none',
              'transition-opacity',
              'duration-300',
            ]"
          >
            <UIcon
              :class="['size-12', { 'animate-spin': isPageLoading }]"
              name="i-material-symbols-refresh-rounded"
            />
          </div>
        </div>

        <span
          v-if="!isReaderLoading"
          class="absolute bottom-6 right-12 text-xs text-muted"
          v-text="percentageLabel"
        />

        <Transition name="reader-load">
          <UButton
            v-if="footnoteReturnCfi && !isReaderLoading"
            class="absolute bottom-4.5 left-1/2 -translate-x-1/2 shadow-lg z-10"
            icon="i-material-symbols-u-turn-left-rounded"
            color="neutral"
            variant="solid"
            size="sm"
            :disabled="isPageLoading"
            :label="$t('reader_footnote_return_button')"
            @click="handleFootnoteReturn"
          />
        </Transition>
      </div>
    </div>

    <AnnotationMenu
      :is-visible="isAnnotationMenuVisible"
      :position="annotationMenuPosition"
      @select="handleAnnotationColorSelect"
      @create-note="handleAnnotationAddNote"
      @report-issue="handleAnnotationReportIssue"
    />

    <AnnotationModal
      v-model:open="isAnnotationModalOpen"
      :annotation="editingAnnotation"
      :text="editingAnnotation?.text || selectedText"
      :initial-color="editingAnnotation?.color || pendingAnnotationColor"
      :is-new-annotation="isNewAnnotation"
      @save="handleAnnotationModalSave"
      @delete="handleAnnotationModalDelete"
    />
  </main>
</template>

<script setup lang="ts">
import type { UseSwipeDirection } from '@vueuse/core'
import ePub, {
  EpubCFI,
  type Book,
  type Rendition,
  type NavItem,
  type Location,
  type Section,
} from '@likecoin/epub-ts'
import type { ReaderLeftSidebarTab } from '~/components/ReaderLeftSidebar.props'
import { ANNOTATION_COLORS_MAP, ANNOTATION_TEXT_MAX_LENGTH } from '~~/shared/constants/annotations'
import { SEARCH_MAX_RESULTS } from '~~/shared/constants/reader-search'

// Force a fresh page instance when switching between NFT and uploaded books:
// useReader() branches on the `source` query at setup, so a within-route
// navigation that flips source would otherwise leave `bookInfo` pointing at
// the wrong composable.
definePageMeta({
  key: route => `reader-epub-${route.query.source === 'upload' ? 'upload' : 'nft'}`,
})

declare interface EpubView {
  window: Window
  settings: {
    direction?: string
  }
}

const config = useRuntimeConfig()
const { loggedIn: hasLoggedIn } = useUserSession()
const route = useRoute()
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account', query: route.query }))
}

const toast = useToast()
const { value: colorModeValue } = useColorModeSync()
const { t: $t } = useI18n()
const queryCache = useQueryCache()
const bookSettingsStore = useBookSettingsStore()
const {
  nftClassId,
  nftId,
  isUploadedBook,
  isPreviewMode,
  backRoute,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
  bookProgressKeyPrefix,
} = useReader()

const { isLibraryBook } = usePlusReadingTracker({
  nftClassId,
  isUploadedBook,
  isPlusReadingEnabled: bookInfo.isPlusReadingEnabled,
  hasFreeEdition: bookInfo.hasFreeEdition,
  nftId,
})

const { openPreviewEndModal, handlePreviewEndBoundary } = usePreviewEndModal({
  nftClassId,
  isEnabled: isPreviewMode.value,
})

const { fetchCustomVoice } = useCustomVoice()
const { fetchConfig: fetchPlusAffiliateConfig } = usePlusAffiliate()

const ttsButtonSizeABTest = useABTest({
  experimentKey: 'reader-tts-button-icon-size',
})
const ttsButtonUI = computed(() =>
  ttsButtonSizeABTest.isVariant('large')
    ? {
        base: 'p-0 sm:p-0 rounded-full',
        leadingIcon: 'size-8',
      }
    : undefined,
)

onMounted(() => {
  if (hasLoggedIn.value) {
    fetchCustomVoice()
    fetchPlusAffiliateConfig()
  }
})
const { errorModal, handleError } = useErrorHandler()
const {
  shouldShowTTSTryModal,
  showTTSTryModal,
} = useTTSTryModal()
const {
  readingProgress,
} = useReaderProgress({
  nftClassId: nftClassId.value,
  bookProgressKeyPrefix: bookProgressKeyPrefix.value,
})

const {
  highlights: annotations,
  bookmarks,
  fetchAnnotations,
  createAnnotation,
  saveAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationById,
} = useAnnotations({ nftClassId })

function getCacheKeyWithSuffix(suffix: ReaderCacheKeySuffix) {
  return getReaderCacheKeyWithSuffix(bookFileCacheKey.value, suffix)
}

const isReaderLoading = ref(true)

const isLeftSidebarOpen = ref(false)
const leftSidebarTab = ref<ReaderLeftSidebarTab>('toc')

const { isIOS, isAndroid } = useAppDetection()

const isPageLoading = ref(false)

const isAnnotationMenuVisible = ref(false)
const annotationMenuPosition = ref({ x: 0, y: 0, yBottom: 0 })
const selectedText = ref('')
const selectedCfi = ref('')
const selectedChapterTitle = ref('')
const isAnnotationModalOpen = ref(false)
const editingAnnotation = ref<Annotation | null>(null)
const isNewAnnotation = ref(false)
const pendingAnnotationColor = ref<AnnotationColor>('yellow')
const isSearchOpen = ref(false)
const readerSearch = useTemplateRef<{ open: () => void } | null>('readerSearch')
const isAnnotationClickInProgress = ref(false)
const pendingSavePromise = ref<Promise<Annotation | null> | null>(null)
const renderedHighlights = new Set<string>()

const { loadingLabel, loadingPercentage, loadFileAsBuffer, abortLoad } = useBookFileLoader()

const isOnline = useOnline()

const { getBookLoadErrorActions } = useReaderErrorActions({
  readerType: 'epub',
  nftClassId,
  nftId,
  bookName: bookInfo.name,
  isUploadedBook,
})

const { startReaderLoad } = useReaderFileLoad({
  isReaderLoading,
  readerType: 'epub',
  load: () => loadEPub(),
  getErrorTitle: () => isOnline.value
    ? $t('error_reader_load_epub_failed')
    : $t('error_reader_book_not_available_offline'),
  getErrorActions: getBookLoadErrorActions,
  handleError,
  abortLoad,
})

onMounted(() => {
  // Kick off background fetches without awaiting so offline / slow API calls
  // don't block the cache-first EPUB load.
  bookSettingsStore.ensureInitialized(nftClassId.value)
  fetchAnnotations()
  if (isUploadedBook.value) {
    const uploadedBooksStore = useUploadedBooksStore()
    if (!uploadedBooksStore.hasFetched) {
      uploadedBooksStore.fetchItems()
    }
  }
  else {
    ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId.value)
      .catch(error => console.warn('Failed to fetch NFT metadata:', error))
  }

  startReaderLoad()
})

const rendition = ref<Rendition>()
const loadedBook = shallowRef<Book>()
const isTTSExtracting = ref(false)
const sectionHrefByFilename = ref<Record<string, string>>({})
const navItems = ref<NavItem[]>([])
const activeNavItemLabel = computed(() => {
  const item = navItems.value.find(item => item.href === activeNavItemHref.value)
  return item?.label || ''
})
const activeNavItemHref = ref<string | undefined>()
const activeTTSElementIndex = useSyncedBookSettings<number | undefined>({
  nftClassId: nftClassId.value,
  key: 'activeTTSElementIndex',
  defaultValue: undefined,
  namespace: 'epub',
})

let isTTSDisplaying = false
let pendingTTSDisplayCfi: string | null = null
// Guards the one-time forced re-render when a vertical manuscript initially
// rendered horizontally (writing-mode declared only on <body>).
let hasEnforcedDefaultVerticalMode = false
const epubCFI = new EpubCFI()

function isSegmentOnCurrentPage(segmentCfi: string): boolean {
  const start = currentPageStartCfi.value
  const end = currentPageEndCfi.value
  if (!start || !end) return false
  try {
    return isCFIWithinPageRange(epubCFI, segmentCfi, start, end)
  }
  catch {
    return false
  }
}

const { isTTSQueryParam, setTTSQueryParam } = useTTSQueryParam()

const { setTTSSegments, setChapterTitles, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
  isLibraryBook,
  onClose: () => setTTSQueryParam(false),
  onSegmentChange: async (segment) => {
    if (!segment?.cfi) return
    activeTTSElementIndex.value = segment.index

    // `relocated` can fire with stale location data while the TTS modal
    // covers the reader (fullscreen on native), so persist progress from
    // the segment CFI directly. Guard on cfi change to avoid no-op
    // Firestore writes when TTS stays within the same paragraph.
    if (segment.cfi !== currentCfi.value) {
      currentCfi.value = segment.cfi
      const locations = loadedBook.value?.locations
      if (locations) {
        percentage.value = locations.percentageFromCfi(segment.cfi) ?? 0
        readingProgress.value = percentage.value
      }
      if (segment.isResync) {
        useBookSettingsStore().flushBatch(nftClassId.value)
      }
    }

    // Skip navigation if the segment is already visible on the current page
    if (isSegmentOnCurrentPage(segment.cfi)) return

    // Serialize display calls: record the latest target CFI and let
    // the current in-flight navigation pick it up when it finishes.
    pendingTTSDisplayCfi = segment.cfi
    if (isTTSDisplaying) return

    while (pendingTTSDisplayCfi) {
      const cfi = pendingTTSDisplayCfi
      pendingTTSDisplayCfi = null
      if (!rendition.value) {
        console.warn('TTS page navigation skipped: rendition not initialized')
        break
      }
      isTTSDisplaying = true
      isPageLoading.value = true
      try {
        await rendition.value.display(cfi)
      }
      catch (error) {
        isPageLoading.value = false
        console.warn('TTS page navigation failed:', error)
      }
      finally {
        isTTSDisplaying = false
      }
    }
  },
})

const currentSectionIndex = ref(0)

const { isTTSPlaying } = useTTSPlayingState()
// Uploaded books aren't on-chain, so they have no publisher analytics
// pipeline to feed — skip per-book reading session reporting for them.
if (!isUploadedBook.value) {
  useReadingSession({
    nftClassId,
    readerType: 'epub',
    progress: computed(() => Math.min(readingProgress.value * 100, 100)),
    isTextToSpeechPlaying: isTTSPlaying,
    chapterIndex: currentSectionIndex,
    isLibraryBook,
    isPreview: isPreviewMode,
  })
}

const lastSectionIndex = ref(0)
const percentage = ref(0)
const percentageLabel = computed(() => `${Math.round(percentage.value * 100)}%`)
const isAtLastPage = computed(() => {
  return currentSectionIndex.value >= lastSectionIndex.value && percentage.value >= 1
})
const isAtFirstPage = computed(() => {
  return currentSectionIndex.value === 0 && percentage.value === 0
})
const currentPageStartCfi = ref<string>('')
const currentPageEndCfi = ref<string>('')
const currentPageHref = ref<string>('')
// The server appends this page to truncated preview EPUBs; landing on it is
// the end-of-preview signal.
const PREVIEW_END_PAGE_HREF_SUFFIX = 'preview-end.xhtml'
// Origin page to return to after a footnote jump; '' hides the return button.
const footnoteReturnCfi = ref<string>('')
// Captured at link-click, confirmed once `relocated` lands on a different page.
let pendingFootnoteReturnCfi: string | null = null
function dismissFootnoteReturn() {
  footnoteReturnCfi.value = ''
  pendingFootnoteReturnCfi = null
}
const currentCfi = useSyncedBookSettings({
  nftClassId: nftClassId.value,
  key: 'cfi',
  defaultValue: '',
  namespace: 'epub',
})

const FONT_SIZE_OPTIONS = [
  6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72,
]
const DEFAULT_FONT_SIZE_INDEX = 8 // Default to 24px
const COPY_CHAR_LIMIT = 500
const SELECTION_CHANGE_DEBOUNCE_MS = 300
const fontSize = useSyncedBookSettings({
  nftClassId: nftClassId.value,
  key: 'fontSize',
  defaultValue: FONT_SIZE_OPTIONS[DEFAULT_FONT_SIZE_INDEX],
  namespace: 'epub',
})

const DEFAULT_LINE_HEIGHT = 1.6
const lineHeight = useSyncedBookSettings({
  nftClassId: nftClassId.value,
  key: 'lineHeight',
  defaultValue: DEFAULT_LINE_HEIGHT,
  namespace: 'epub',
})

const EPUB_WRITING_MODES = {
  horizontal: 'horizontal-tb',
  vertical: 'vertical-rl',
} as const
type EpubWritingMode = typeof EPUB_WRITING_MODES[keyof typeof EPUB_WRITING_MODES]

const EPUB_TEXT_DIRECTIONS = {
  ltr: 'ltr',
  rtl: 'rtl',
} as const
type EpubTextDirection = typeof EPUB_TEXT_DIRECTIONS[keyof typeof EPUB_TEXT_DIRECTIONS]

const FALLBACK_WRITING_MODE = EPUB_WRITING_MODES.horizontal
const WRITING_MODE_SETTING_KEY = 'writingMode'
const EPUB_SETTING_NAMESPACE = 'epub'
const WRITING_MODE_DB_KEY = getBookSettingDbKey({
  key: WRITING_MODE_SETTING_KEY,
  namespace: EPUB_SETTING_NAMESPACE,
})
// The book's own writing mode, detected from the first un-overridden render;
// stays `undefined` until then so a forced mode is never mistaken for the
// book's natural layout when deriving page-progression direction.
const detectedNaturalWritingMode = ref<EpubWritingMode>()
const originalWritingMode = computed(() => detectedNaturalWritingMode.value ?? FALLBACK_WRITING_MODE)
const writingModeSetting = useSyncedBookSettings<EpubWritingMode>({
  nftClassId: nftClassId.value,
  key: WRITING_MODE_SETTING_KEY,
  defaultValue: FALLBACK_WRITING_MODE,
  namespace: EPUB_SETTING_NAMESPACE,
})
const hasSavedWritingMode = computed(() => {
  return bookSettingsStore.getSettings(nftClassId.value)?.[WRITING_MODE_DB_KEY] !== undefined
})
const writingMode = computed(() => {
  return hasSavedWritingMode.value ? writingModeSetting.value : originalWritingMode.value
})
// Force our writing-mode onto the document when the user picked a mode, or when
// the manuscript is vertical: some vertical EPUBs declare writing-mode only on
// <body>, which epub.js ignores (it sizes columns from <html>), so they render
// horizontally unless we enforce it.
const shouldEnforceWritingMode = computed(() =>
  hasSavedWritingMode.value || originalWritingMode.value === EPUB_WRITING_MODES.vertical,
)
// The book's own `page-progression-direction`, from metadata. A vertical book's
// implicit RTL must be told apart from a genuine horizontal-RTL script (Arabic,
// Hebrew) so forcing horizontal layout doesn't wrongly keep RTL turns.
const bookProgressionIsRTL = computed(() =>
  loadedBook.value?.packaging?.metadata?.direction === EPUB_TEXT_DIRECTIONS.rtl,
)
// Requires a positive horizontal detection (not the default fallback): a book
// whose natural mode we couldn't observe — e.g. reopened with a saved horizontal
// override that forces the DOM — must not be treated as horizontal-RTL.
const isBookHorizontalRTL = computed(() =>
  bookProgressionIsRTL.value && detectedNaturalWritingMode.value === EPUB_WRITING_MODES.horizontal,
)

function getDirectionForWritingMode(mode: EpubWritingMode): EpubTextDirection {
  if (mode === EPUB_WRITING_MODES.vertical) return EPUB_TEXT_DIRECTIONS.rtl
  return isBookHorizontalRTL.value ? EPUB_TEXT_DIRECTIONS.rtl : EPUB_TEXT_DIRECTIONS.ltr
}
// Left/right page turns and arrow visibility follow the page-progression
// direction: RTL for vertical layouts and genuine horizontal-RTL scripts.
const shouldFlipFromRightToLeft = computed(() =>
  getDirectionForWritingMode(writingMode.value) === EPUB_TEXT_DIRECTIONS.rtl,
)

function detectElementWritingMode(doc: Document, element: Element | null): EpubWritingMode {
  const computedMode = element ? doc.defaultView?.getComputedStyle(element).writingMode : undefined
  return computedMode?.startsWith('vertical-')
    ? EPUB_WRITING_MODES.vertical
    : EPUB_WRITING_MODES.horizontal
}

function getWritingModeStyles() {
  const isVerticalWritingMode = writingMode.value === EPUB_WRITING_MODES.vertical

  return {
    'writing-mode': writingMode.value,
    '-webkit-writing-mode': writingMode.value,
    'text-orientation': 'mixed',
    '-webkit-text-orientation': 'mixed',
    'line-break': isVerticalWritingMode ? 'strict' : 'auto',
  } satisfies Record<string, string>
}

function applyWritingModeToDocument(document: Document) {
  // Override only when enforcing (user picked a mode, or vertical manuscript);
  // otherwise let the book's own CSS declare writing-mode so epub.js sizes
  // columns from it.
  if (!shouldEnforceWritingMode.value) return
  const documentElement = document.documentElement
  const body = document.body
  if (!documentElement || !body) return

  const writingModeStyles = getWritingModeStyles()
  Object.entries(writingModeStyles).forEach(([property, value]) => {
    documentElement.style.setProperty(property, value)
    body.style.setProperty(property, value)
  })
}

type SectionWithDocument = Section & { document?: Document }

function applyWritingModeToLoadedSections() {
  loadedBook.value?.spine?.each((section: SectionWithDocument) => {
    if (section.document instanceof Document) {
      applyWritingModeToDocument(section.document)
    }
  })
}

function applyTheme() {
  if (!rendition.value) return

  const isDarkMode = colorModeValue.value === 'dark'
  const bodyCSS: Record<string, string> = {
    'color': isDarkMode ? '#f9f9f9 !important' : '#333',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'direction': 'ltr',
  }
  if (isDarkMode) {
    bodyCSS['background-color'] = '#131313 !important'
  }
  const textCSS: Record<string, string> = {
    'line-height': `${lineHeight.value}em !important`,
  }
  if (isDarkMode) {
    textCSS.color = bodyCSS.color as string
    textCSS['background-color'] = 'transparent !important'
  }
  if (isIOS.value || isAndroid.value) {
    textCSS['-webkit-touch-callout'] = 'none'
  }
  const anchorCSS: Record<string, string> = {
    color: isDarkMode ? '#9ecfff !important' : '#0066cc',
  }
  const themeRules: Record<string, Record<string, string>> = {
    'body': bodyCSS,
    'p, div, span, h1, h2, h3, h4, h5, h6, li': textCSS,
    'a': anchorCSS,
  }
  // Only layer a writing-mode rule on top of the book's own CSS when enforcing;
  // otherwise it changes the initial column layout calc and can skew
  // textWidth/textHeight on the first rendered page.
  if (shouldEnforceWritingMode.value) {
    const writingModeStyles = getWritingModeStyles()
    themeRules.html = writingModeStyles
    Object.assign(bodyCSS, writingModeStyles)
  }
  rendition.value.themes.default(themeRules)
  rendition.value.themes.fontSize(`${fontSize.value}px`)
}

watch(fontSize, () => {
  applyTheme()
})

watch(lineHeight, () => {
  applyTheme()
})

watch(colorModeValue, () => {
  applyTheme()
})

let cleanUpClickListener: (() => void) | undefined
let removeSwipeListener: (() => void) | undefined
let removeSelectAllByHotkeyListener: (() => void) | undefined
let removeFindHotkeyListener: (() => void) | undefined
let removeCopyListener: (() => void) | undefined
let removeMouseUpListener: (() => void) | undefined
let removeSelectionChangeListener: (() => void) | undefined
let removeContextMenuListener: (() => void) | undefined
const { isIntercomVisible, showNewMessageWithVisibility } = useIntercomVisibility()
useHead({
  htmlAttrs: {
    class: computed(() => (isIntercomVisible.value ? 'intercom-visible' : '')),
  },
})
const renditionElement = useTemplateRef<HTMLDivElement>('reader')
const renditionViewWindow = ref<Window | undefined>(undefined)

// Sync epub.js's page-progression direction with the writing mode, else
// next()/prev() and the turn arrows stay in the book's original direction after
// a switch (blank pages, snap-back). Set the fields directly rather than via
// Rendition.direction(), which also re-displays — our callers already do that.
function applyRenditionDirection() {
  const currentRendition = rendition.value
  if (!currentRendition) return
  const direction = getDirectionForWritingMode(writingMode.value)
  currentRendition.settings.direction = direction
  currentRendition.manager?.direction(direction)
}

async function rerenderRenditionAtCurrentLocation() {
  if (!rendition.value) return

  const target = currentCfi.value || currentPageStartCfi.value || activeNavItemHref.value
  renderedHighlights.clear()
  isPageLoading.value = true
  applyRenditionDirection()
  rendition.value.clear()
  await nextTick()

  const hasDisplayed = await displayRendition(target, { isSilentError: true })
  if (!hasDisplayed) {
    await displayRendition(undefined)
  }
}

async function displayRendition(href?: string, { isSilentError = false } = {}) {
  if (rendition.value) {
    try {
      await rendition.value.display(href)
      return true
    }
    catch (error) {
      console.error(`Error occurred when displaying${href ? ` ${href}` : ''} in rendition of ${nftClassId.value}`, error)
      if (!isSilentError) {
        await handleError(error, { description: $t('reader_epub_rendition_display_failed') })
      }
    }
  }
  return false
}

async function loadEPub() {
  renderedHighlights.clear()
  // Reset per-book writing-mode detection so a prior book's result can't leak in
  // if this page instance is reused across books.
  detectedNaturalWritingMode.value = undefined
  hasEnforcedDefaultVerticalMode = false
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value, bookFileCacheKey.value)
  if (!buffer) {
    return
  }

  const book = ePub(buffer)
  await book.ready
  loadedBook.value = book
  const toc = await book.loaded!.navigation.then(async (navigation) => {
    return navigation.toc.flatMap((item) => {
      if (item.subitems) {
        return [item, ...item.subitems]
      }
      return item
    })
  })

  try {
    let isLocationLoaded = false
    const locationCacheKey = getCacheKeyWithSuffix('locations')
    if (window.localStorage) {
      const locationCache = window.localStorage.getItem(locationCacheKey)
      if (locationCache) {
        book.locations!.load(locationCache)
        isLocationLoaded = true
      }
    }
    if (!isLocationLoaded) {
      // NOTE: https://github.com/futurepress/epub.js/issues/278
      // Break sections by 1000 chars for calculating percentage
      book.locations!.generate(1000).then(() => {
        try {
          if (window.localStorage) {
            window.localStorage.setItem(locationCacheKey, book.locations!.save())
          }
        }
        catch (error) {
          console.warn('Failed to save location cache:', error)
        }
      })
    }
  }
  catch (error) {
    console.warn('Failed to get location cache:', error)
  }

  book.spine!.each((section: Section) => {
    if (!section.href) return
    const filename = getHrefBaseFilename(section.href)
    if (!filename) return
    sectionHrefByFilename.value[filename] = section.href
  })
  navItems.value = toc.filter((item): item is NavItem => item !== null)

  activeNavItemHref.value = book.spine!.first()!.href
  currentPageHref.value = activeNavItemHref.value ?? ''
  lastSectionIndex.value = book.spine!.last()!.index ?? 0

  if (!renditionElement.value) {
    return
  }

  rendition.value?.destroy()
  rendition.value = book.renderTo(renditionElement.value, {
    width: '100%',
    height: '100%',
    allowScriptedContent: true,
    spread: 'none',
  })
  book.spine!.hooks.content.register((document: Document) => {
    applyWritingModeToDocument(document)
  })

  // Settings load lazily (kicked off un-awaited in onMounted). Apply the theme
  // and resolve the saved CFI only once font-size/line-height/cfi have arrived:
  // injecting font-size/line-height *after* anchoring reflows the chapter and
  // strands the restore on an earlier page than the one that was saved.
  await bookSettingsStore.ensureInitialized(nftClassId.value)
  await nextTick()
  applyTheme()
  // A saved (or forced) writing mode overrides the DOM but not epub.js's
  // page-progression direction, so sync it before the first paint — otherwise
  // next()/prev() and the turn arrows stay reversed until the first re-render.
  if (shouldEnforceWritingMode.value) {
    applyRenditionDirection()
  }
  isPageLoading.value = true

  let hasDisplayed = false
  if (currentCfi.value) {
    hasDisplayed = await displayRendition(currentCfi.value, { isSilentError: true })
  }
  if (!hasDisplayed) {
    const fallbackItem = findNextNavItemAfterTOC(navItems.value)
    if (fallbackItem) {
      await setActiveNavItem(fallbackItem, { isSilentError: true })
      hasDisplayed = true
    }
  }
  if (!hasDisplayed) {
    hasDisplayed = await displayRendition()
    if (!hasDisplayed) {
      return
    }
  }

  // Clear stale TTS index from previous session so it doesn't override current page position
  activeTTSElementIndex.value = undefined

  rendition.value.on('rendered', (_section: Section, view: EpubView) => {
    // `rendered` fires for sections epub.js pre-renders into its paging
    // buffer, so this can be a neighbour, not the visible page — the section
    // index comes from the authoritative `relocated` handler instead.
    renditionViewWindow.value = view.window
    isPageLoading.value = false
    if (!hasSavedWritingMode.value && detectedNaturalWritingMode.value === undefined && !hasEnforcedDefaultVerticalMode && view.window?.document) {
      const renderedDoc = view.window.document
      // epub.js sizes columns from <html>, and `writing-mode` doesn't inherit
      // from <body> up to <html>, so read <html> first and only fall back to
      // <body>. Reused below, so compute it once.
      const htmlMode = detectElementWritingMode(renderedDoc, renderedDoc.documentElement)
      detectedNaturalWritingMode.value = htmlMode === EPUB_WRITING_MODES.vertical
        ? EPUB_WRITING_MODES.vertical
        : detectElementWritingMode(renderedDoc, renderedDoc.body)
      // A vertical manuscript epub.js laid out horizontally (writing-mode on
      // <body> only, which epub.js ignores) needs the mode forced and one
      // re-render to flip to vertical.
      if (detectedNaturalWritingMode.value === EPUB_WRITING_MODES.vertical
        && htmlMode === EPUB_WRITING_MODES.horizontal) {
        hasEnforcedDefaultVerticalMode = true
        applyWritingModeToLoadedSections()
        applyTheme()
        void rerenderRenditionAtCurrentLocation()
      }
      // A book that renders vertically on its own (writing-mode on <html>) never
      // re-renders here, so epub.js keeps its metadata/default page-progression
      // direction — sync next()/prev() and the turn arrows to the vertical RTL.
      else if (detectedNaturalWritingMode.value === EPUB_WRITING_MODES.vertical) {
        applyRenditionDirection()
      }
    }

    if (cleanUpClickListener) {
      cleanUpClickListener()
    }
    cleanUpClickListener = useEventListener(view.window, 'click', (event) => {
      for (const element of event.composedPath() as HTMLElement[]) {
        // NOTE: Ignore clicks on links, but record the current page first so a
        // footnote/in-book jump can offer a way back (confirmed in `relocated`).
        if (element.tagName === 'A') {
          const href = element.getAttribute('href') || ''
          if (href && !isExternalLink(href)) {
            // A further in-book jump while a return is pending/active means the
            // user is navigating onward — dismiss rather than chain origins.
            if (footnoteReturnCfi.value || pendingFootnoteReturnCfi) {
              dismissFootnoteReturn()
            }
            else {
              pendingFootnoteReturnCfi = currentPageStartCfi.value || currentCfi.value || null
            }
          }
          return
        }
      }

      // NOTE: Ignore page-turn if annotation was clicked or menu is open
      if (isAnnotationClickInProgress.value || isAnnotationMenuVisible.value) {
        return
      }

      if (!checkIsSelectingText() && view.window && window.innerWidth < 1024) {
        const width = rendition.value?.manager?.container.clientWidth || 0
        const range = width * 0.45
        const x = event.clientX % width // Normalize x to be within the window
        if (x < range) {
          turnPageLeft()
          useLogEvent('reader_navigate_button_arrow_mobile')
        }
        else if (width - x < range) {
          turnPageRight()
          useLogEvent('reader_navigate_button_arrow_mobile')
        }
      }
    })

    if (removeSwipeListener) {
      removeSwipeListener()
    }
    ({ stop: removeSwipeListener } = useSwipe(
      view.window,
      {
        onSwipeEnd: (_: TouchEvent, direction: UseSwipeDirection) => {
          if (checkIsSelectingText() || isAnnotationMenuVisible.value) {
            // Do not navigate when selecting text or annotation menu is open
            return
          }

          switch (direction) {
            case 'left':
              turnPageRight()
              useLogEvent('reader_navigate_swipe_horizontal')
              break
            case 'right':
              turnPageLeft()
              useLogEvent('reader_navigate_swipe_horizontal')
              break
            case 'up':
              nextPage()
              useLogEvent('reader_navigate_swipe_vertical')
              break
            case 'down':
              prevPage()
              useLogEvent('reader_navigate_swipe_vertical')
              break
            default:
              break
          }
        },
      },
    ))

    if (removeSelectAllByHotkeyListener) {
      removeSelectAllByHotkeyListener()
    }
    removeSelectAllByHotkeyListener = onKeyStroke(['a', 'A'], (event) => {
      // Prevent selecting all texts by Ctrl/Cmd + A
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
      }
    }, { target: view.window })

    // Capture Ctrl/Cmd + F inside the rendition iframe and open our search UI
    // instead of the browser's native find bar.
    if (removeFindHotkeyListener) {
      removeFindHotkeyListener()
    }
    removeFindHotkeyListener = onKeyStroke(['f', 'F'], (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      readerSearch.value?.open()
    }, { target: view.window })

    if (removeCopyListener) {
      removeCopyListener()
    }
    removeCopyListener = useEventListener(view.window, 'copy', (event: ClipboardEvent) => {
      const selection = view.window.getSelection()
      const selectedText = selection?.toString() || ''

      if (selectedText.length > 0) {
        event.preventDefault()
        event.stopPropagation()

        const limitedText = selectedText.slice(0, COPY_CHAR_LIMIT)
        const productPageURL = `${config.public.baseURL}${localeRoute({ name: 'store-nftClassId', params: { nftClassId: nftClassId.value } })?.path || ''}`
        const textWithAttribution = `${limitedText}\n\n${bookInfo.name.value}\n${productPageURL}`

        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', textWithAttribution)
        }
      }
    }, { capture: true })

    if (removeMouseUpListener) {
      removeMouseUpListener()
    }
    removeMouseUpListener = useEventListener(view.window, 'mouseup', () => {
      // Delay for window.getSelection() reflects the final selection state
      setTimeout(() => {
        handleTextSelection(view.window)
      }, 10)
    })

    if (removeSelectionChangeListener) {
      removeSelectionChangeListener()
    }
    const debouncedSelectionChange = useDebounceFn(() => {
      handleTextSelection(view.window)
    }, SELECTION_CHANGE_DEBOUNCE_MS)
    removeSelectionChangeListener = useEventListener(view.window.document, 'selectionchange', debouncedSelectionChange)

    if (removeContextMenuListener) {
      removeContextMenuListener()
    }
    if (isIOS.value || isAndroid.value) {
      removeContextMenuListener = useEventListener(view.window, 'contextmenu', (event: Event) => {
        event.preventDefault()
      })
    }

    renderAnnotations()
  })

  rendition.value.on('relocated', (location: Location) => {
    isPageLoading.value = false
    currentPageStartCfi.value = location.start.cfi
    currentPageEndCfi.value = location.end.cfi
    // Authoritative section of the visible page (see the `rendered` handler).
    currentSectionIndex.value = location.start.index
    const href = location.start.href
    currentPageHref.value = href
    activeNavItemHref.value = resolveActiveNavItemHref(href)
    if (isPreviewMode.value) {
      handlePreviewEndBoundary(href.endsWith(PREVIEW_END_PAGE_HREF_SUFFIX))
    }
    // Footnote return: a just-clicked in-book link drove this relocation; offer
    // a way back only if we actually landed on a different page. Otherwise drop
    // the button once the user is back on the origin page by any other means.
    if (pendingFootnoteReturnCfi) {
      const origin = pendingFootnoteReturnCfi
      pendingFootnoteReturnCfi = null
      footnoteReturnCfi.value = origin && !isSegmentOnCurrentPage(origin) ? origin : ''
    }
    else if (footnoteReturnCfi.value && isSegmentOnCurrentPage(footnoteReturnCfi.value)) {
      footnoteReturnCfi.value = ''
    }
    // During listen mode `onSegmentChange` owns progress: it writes the
    // segment-accurate position, while `relocated` only sees the page start
    // (and stale data while the modal covers the reader on native).
    if (isTTSQueryParam.value) return
    // Any read-mode page change invalidates a persisted TTS index: the user
    // has read past where playback last was, so the next listen resumes from
    // this page via the cfi lookup. relocated is the single choke point that
    // also covers swipe, reflow and native-shell turns.
    activeTTSElementIndex.value = undefined
    percentage.value = book.locations!.percentageFromCfi(location.start.cfi) ?? 0
    currentCfi.value = location.start.cfi
    readingProgress.value = percentage.value
  })

  if (isTTSQueryParam.value) {
    if (bookInfo.isAudioHidden.value) {
      toast.add({
        title: $t('reader_text_to_speech_button_disabled_tooltip'),
        duration: 3000,
        progress: false,
      })
      setTTSQueryParam(false)
    }
    else if (shouldShowTTSTryModal.value) {
      openTTSTryModal()
    }
    else {
      onClickTTSPlay()
    }
  }
  else if (shouldShowTTSTryModal.value && !bookInfo.isAudioHidden.value) {
    openTTSTryModal()
  }
}

function openTTSTryModal() {
  showTTSTryModal({
    nftClassId: nftClassId.value,
    onVoiceSelected: () => {
      onClickTTSPlay()
    },
    onSnooze: () => setTTSQueryParam(false),
    onDismiss: () => setTTSQueryParam(false),
  })
}
// Absolute (scheme or protocol-relative) links open externally; everything else
// is an in-book link that epub.js navigates via display().
const EXTERNAL_LINK_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
function isExternalLink(href: string): boolean {
  return EXTERNAL_LINK_RE.test(href)
}

function getHrefBasePath(href: string): string {
  return href.split('#')[0] ?? href
}

function getHrefBaseFilename(href: string): string {
  const path = getHrefBasePath(href)
  return path.split('/').pop() ?? path
}

// TOC hrefs and spine hrefs often disagree (TOC may use anchors like
// `ch5.xhtml#sec-1` while the spine lists `OEBPS/ch5.xhtml`), so strict
// equality can't be relied on to locate the active chapter. Fall back to
// filename matching, preferring the unanchored (chapter-start) entry.
function resolveActiveNavItemHref(pageHref: string): string | undefined {
  if (!pageHref) return undefined
  if (navItems.value.some(item => item.href === pageHref)) return pageHref

  const pageFilename = getHrefBaseFilename(pageHref)
  const sectionItems = navItems.value.filter(item => getHrefBaseFilename(item.href) === pageFilename)
  if (!sectionItems.length) return undefined

  const unanchored = sectionItems.find(item => !item.href.includes('#'))
  return (unanchored ?? sectionItems[0])?.href
}

function findNextNavItemAfterTOC(navItems: NavItem[]): NavItem | undefined {
  const firstChapter = navItems[0]
  if (!firstChapter) return undefined

  const tocKeywords = ['目錄', '目录', 'contents', 'table of contents', 'toc', 'index']
  const isTOC = tocKeywords.some(keyword =>
    firstChapter.label.toLowerCase().includes(keyword),
  )

  return isTOC ? navItems[1] : firstChapter
}

async function extractTTSSegments(book: Book) {
  const sections: Section[] = []
  book.spine!.each((section: Section) => {
    sections.push(section)
  })

  const segments: TTSSegment[] = []
  const chapterTitles: Record<number, string> = {}

  const FOOTNOTE_CLASS_RE = /\b(footnote|endnote|fn\w*)\b/i
  const FOOTNOTE_SUP_RE = /^\(?\d+\)?$/
  // Long enough to be unique within a paragraph in practice, short enough
  // that any whitespace-normalization mismatch from mergeParts stays inside
  // the anchor window.
  const SEGMENT_CFI_ANCHOR_LENGTH = 20
  const SEGMENT_WS_CHARS = '\\s\\u200B'

  for (const section of sections) {
    if (!loadedBook.value) break
    try {
      if (!section.href) continue
      const chapter = await book.load(section.href)

      if (!(chapter instanceof Document)) {
        console.warn(`No document found for section ${section.href}`)
        continue
      }

      const titleText = chapter.querySelector('title')?.textContent?.trim() || ''
      const chapterTitle = (titleText && titleText.toLowerCase() !== 'unknown' && titleText !== '未知')
        ? titleText
        : chapter.querySelector('h1, h2, h3')?.textContent?.trim() || ''
      chapterTitles[section.index ?? 0] = chapterTitle

      const elements = Array.from(
        chapter.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'),
      ).filter((el) => {
        if (!el.textContent?.trim()) return false
        // Skip footnote/endnote sections (EPUB3 semantic roles or class-based)
        if (el.closest('[role="doc-endnotes"], [role="doc-footnote"]')) return false
        const ancestor = el.closest('section, aside')
        if (ancestor?.getAttribute('epub:type')?.match(/footnote|endnote/i)) return false
        if (FOOTNOTE_CLASS_RE.test(el.className || '')) return false
        return true
      })

      // Inline footnote subtrees are stripped from TTS playback. A walker
      // operating on the original DOM skips the same elements that the
      // previous clone-and-remove pass deleted; we walk the original (not a
      // clone) so cfiFromRange below can resolve text-node positions back to
      // CFIs in the section document.
      const isInlineFootnote = (node: Element): boolean => {
        if (FOOTNOTE_CLASS_RE.test(node.className || '')) return true
        if (node.matches?.('a[role="doc-noteref"]')) return true
        if (node.classList?.contains('footnote-number')) return true
        if ((node.tagName === 'A' || node.tagName === 'SPAN')
          && node.getAttribute('epub:type') === 'noteref') return true
        if (node.tagName === 'A') {
          const sup = node.querySelector(':scope > sup')
          if (sup && FOOTNOTE_SUP_RE.test(sup.textContent?.trim() || '')) return true
        }
        return false
      }

      elements.forEach((el, elIndex) => {
        const elementCFI = section.cfiFromElement(el)

        const textNodes: Array<{ node: Text, startInConcat: number }> = []
        let concatText = ''
        const walk = (node: Node): void => {
          if (node.nodeType === Node.TEXT_NODE) {
            const data = (node as Text).data
            if (data) {
              textNodes.push({ node: node as Text, startInConcat: concatText.length })
              concatText += data
            }
            return
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return
          const child = node as Element
          if (isInlineFootnote(child)) return
          for (const c of Array.from(child.childNodes)) walk(c)
        }
        walk(el)

        const text = concatText.trim()
        if (!text) return

        const cfiAtConcatOffset = (offset: number): string => {
          let lo = 0
          let hi = textNodes.length - 1
          let nodeIndex = 0
          while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (textNodes[mid]!.startInConcat <= offset) {
              nodeIndex = mid
              lo = mid + 1
            }
            else {
              hi = mid - 1
            }
          }
          const entry = textNodes[nodeIndex]
          if (!entry) return elementCFI
          const offsetInNode = Math.min(Math.max(offset - entry.startInConcat, 0), entry.node.length)
          try {
            const range = chapter.createRange()
            range.setStart(entry.node, offsetInNode)
            range.setEnd(entry.node, offsetInNode)
            return section.cfiFromRange(range) || elementCFI
          }
          catch {
            return elementCFI
          }
        }

        // mergeParts inside splitTextIntoSegments collapses whitespace runs and
        // joins prefix punctuation onto the next speakable chunk, so segment
        // texts are not guaranteed to be raw substrings of `text`. A
        // whitespace-flexible regex over a short anchor at the start of each
        // segment is enough to locate the boundary; fall back to elementCFI
        // on a miss.
        const leadTrim = concatText.length - concatText.trimStart().length
        const leadWsRE = new RegExp(`^[${SEGMENT_WS_CHARS}]+`)
        const wsRunRE = new RegExp(`[${SEGMENT_WS_CHARS}]+`, 'g')
        let searchFrom = leadTrim

        splitTextIntoSegments(text).forEach((segmentText, segIndex) => {
          let cfi = elementCFI
          const anchor = segmentText.replace(leadWsRE, '').slice(0, SEGMENT_CFI_ANCHOR_LENGTH)
          if (anchor) {
            const pattern = escapeRegExp(anchor).replace(wsRunRE, `[${SEGMENT_WS_CHARS}]+`)
            const stickyRE = new RegExp(pattern, 'g')
            stickyRE.lastIndex = searchFrom
            const match = stickyRE.exec(concatText)
            if (match) {
              cfi = cfiAtConcatOffset(match.index)
              // Advance past the full segment, not just the anchor: segment
              // text is whitespace-normalized so its length is a lower bound
              // on the span in concat — sufficient to keep the next segment's
              // anchor from latching onto a recurring phrase inside the
              // current segment's tail.
              searchFrom = match.index + Math.max(match[0].length, segmentText.length)
            }
          }

          segments.push({
            text: segmentText,
            id: `${section.index}-${elIndex}-${segIndex}`,
            cfi,
            sectionIndex: section.index ?? 0,
            elementIndex: elIndex,
          })
        })
      })
    }
    catch (err) {
      console.warn(`Failed to load section ${section.href}`, err)
    }
  }

  return { segments: mergeShortTTSSegments(segments), chapterTitles }
}

async function setActiveNavItem(item: NavItem, { isSilentError = false } = {}) {
  activeTTSElementIndex.value = undefined
  activeNavItemHref.value = item.href
  isPageLoading.value = true
  // Explicit TOC navigation isn't a footnote jump; drop any pending return.
  dismissFootnoteReturn()

  let hasDisplayed = await displayRendition(item.href, { isSilentError: true })
  if (hasDisplayed) return

  // Try replacing nav item's href with spine's href if section cannot be found
  const anchor = item.href.split('#')[1]
  const filename = getHrefBaseFilename(item.href)
  if (filename) {
    let spineHref = sectionHrefByFilename.value[filename]
    if (spineHref) {
      if (anchor) {
        spineHref = `${spineHref}#${anchor}`
      }
      // Preview mode handles the failure below with its own CTA, so stay silent
      // here to avoid stacking an error modal in front of it.
      hasDisplayed = await displayRendition(spineHref, { isSilentError: isSilentError || isPreviewMode.value })
      if (hasDisplayed) {
        return
      }
    }
  }
  // In preview mode the ToC still lists chapters beyond the truncation point
  // (the server keeps the nav doc intact), so a failed jump means the chapter
  // was cut — offer the purchase/subscribe CTA instead of an error.
  if (isPreviewMode.value && !isSilentError) {
    isPageLoading.value = false
    await openPreviewEndModal('toc')
    return
  }
  if (!isSilentError) {
    await errorModal.open({ description: $t('reader_epub_rendition_display_failed') }).result
  }
}

function nextPage() {
  activeTTSElementIndex.value = undefined
  isPageLoading.value = true
  isAnnotationMenuVisible.value = false
  rendition.value?.next()
}

function prevPage() {
  activeTTSElementIndex.value = undefined
  isPageLoading.value = true
  isAnnotationMenuVisible.value = false
  rendition.value?.prev()
}

function turnPageLeft() {
  if (shouldFlipFromRightToLeft.value) {
    nextPage()
  }
  else {
    prevPage()
  }
}

function turnPageRight() {
  if (shouldFlipFromRightToLeft.value) {
    prevPage()
  }
  else {
    nextPage()
  }
}

function adjustFontSize(size: number) {
  const index = fontSize.value ? FONT_SIZE_OPTIONS.indexOf(fontSize.value) : DEFAULT_FONT_SIZE_INDEX
  const newValue = FONT_SIZE_OPTIONS[index + size]
  if (newValue && newValue !== fontSize.value) {
    fontSize.value = newValue
    useLogEvent('reader_setting_changed', { nft_class_id: nftClassId.value, setting: 'font_size', value: newValue })
  }
}

function increaseFontSize() {
  adjustFontSize(+1)
}

function decreaseFontSize() {
  adjustFontSize(-1)
}

function adjustLineHeight(delta: number) {
  const newHeight = Math.round((lineHeight.value + delta) * 10) / 10
  if (newHeight !== lineHeight.value) {
    lineHeight.value = newHeight
    useLogEvent('reader_setting_changed', { nft_class_id: nftClassId.value, setting: 'line_height', value: newHeight })
  }
}

function increaseLineHeight() {
  adjustLineHeight(0.1)
}

function decreaseLineHeight() {
  adjustLineHeight(-0.1)
}

async function setWritingMode(mode: EpubWritingMode) {
  if (mode === writingMode.value && hasSavedWritingMode.value) return

  writingModeSetting.value = mode
  applyWritingModeToLoadedSections()
  applyTheme()
  await rerenderRenditionAtCurrentLocation()
  useLogEvent('reader_setting_changed', { nft_class_id: nftClassId.value, setting: 'writing_mode', value: mode })
}

async function restoreDefaultDisplayOptions() {
  const previousFontSize = fontSize.value
  const previousLineHeight = lineHeight.value
  const previousWritingMode = writingMode.value

  fontSize.value = FONT_SIZE_OPTIONS[DEFAULT_FONT_SIZE_INDEX]
  lineHeight.value = DEFAULT_LINE_HEIGHT
  writingModeSetting.value = originalWritingMode.value
  const hasFontSizeChanged = previousFontSize !== fontSize.value
  const hasLineHeightChanged = previousLineHeight !== lineHeight.value
  const hasWritingModeChanged = previousWritingMode !== writingMode.value

  applyWritingModeToLoadedSections()
  applyTheme()

  if (hasFontSizeChanged || hasLineHeightChanged || hasWritingModeChanged) {
    await rerenderRenditionAtCurrentLocation()
  }

  if (hasFontSizeChanged) {
    useLogEvent('reader_setting_changed', {
      nft_class_id: nftClassId.value,
      setting: 'font_size',
      value: fontSize.value,
    })
  }
  if (hasLineHeightChanged) {
    useLogEvent('reader_setting_changed', {
      nft_class_id: nftClassId.value,
      setting: 'line_height',
      value: lineHeight.value,
    })
  }
  if (previousWritingMode !== writingMode.value) {
    useLogEvent('reader_setting_changed', {
      nft_class_id: nftClassId.value,
      setting: 'writing_mode',
      value: writingMode.value,
    })
  }
}

const activeNavItemElements = useTemplateRef<HTMLLIElement[]>('activeNavItemElements')

function handleLeftSidebarTriggerClick() {
  if (isLeftSidebarOpen.value) return
  leftSidebarTab.value = navItems.value.length ? 'toc' : 'annotations'
}

async function handleTOCTabShown() {
  useLogEvent('reader_toc_open', { nft_class_id: nftClassId.value })
  await nextTick()
  if (!isLeftSidebarOpen.value || leftSidebarTab.value !== 'toc') return
  activeNavItemElements.value?.[0]?.scrollIntoView({ block: 'center', inline: 'center' })
}

watch([isLeftSidebarOpen, leftSidebarTab], ([open, tab]) => {
  if (!open) return
  if (tab !== 'toc') return
  void handleTOCTabShown()
})

let ttsExtractionPromise: Promise<void> | undefined
async function ensureTTSExtracted() {
  if (!loadedBook.value) return
  if (!ttsExtractionPromise) {
    isTTSExtracting.value = true
    ttsExtractionPromise = extractTTSSegments(loadedBook.value)
      .then(({ segments, chapterTitles }) => {
        setTTSSegments(segments)
        setChapterTitles(chapterTitles)
      })
      .catch((error) => {
        console.warn('Failed to extract TTS segments:', error)
        ttsExtractionPromise = undefined
      })
      .finally(() => {
        isTTSExtracting.value = false
      })
  }
  await ttsExtractionPromise
}

async function onClickTTSPlay() {
  await ensureTTSExtracted()
  setTTSQueryParam(true)
  openPlayer({
    ttsIndex: activeTTSElementIndex.value,
    sectionIndex: currentSectionIndex.value,
    // On auto-resume reopen, `relocated` may not have populated the live page
    // anchor yet; fall back to the restored reading position so TTS resumes
    // there instead of defaulting to segment 0 and resetting progress.
    cfi: currentPageStartCfi.value || currentCfi.value,
    pageEndCFI: currentPageEndCfi.value,
  })
}

function getChapterTitleForSectionHref(sectionHref: string | undefined): string | undefined {
  if (!sectionHref) return undefined
  const bareHref = getHrefBasePath(sectionHref)
  const match = navItems.value.find(item => item.href === sectionHref || getHrefBasePath(item.href) === bareHref)
  return match?.label
}

async function handleSearchEPUB(query: string, signal: AbortSignal): Promise<ReaderSearchResult[]> {
  const book = loadedBook.value
  if (!book) return []

  const sections: Section[] = []
  book.spine!.each((section: Section) => sections.push(section))

  const results: ReaderSearchResult[] = []
  for (const section of sections) {
    throwIfAborted(signal)
    if (results.length >= SEARCH_MAX_RESULTS) break
    if (!section.href) continue
    const wasLoaded = !!section.document
    try {
      if (!wasLoaded) {
        // Reuse the same loader path as extractTTSSegments — book.load returns
        // a parsed Document; attaching it to the section lets section.find
        // work and also caches subsequent access.
        const doc = await book.load(section.href)
        throwIfAborted(signal)
        if (!(doc instanceof Document)) continue
        section.document = doc
        section.contents = doc.documentElement
      }
      if (!section.document) continue
      const matches = section.find(query)
      const chapterTitle = getChapterTitleForSectionHref(section.href)
      for (const [i, match] of matches.entries()) {
        results.push({
          id: `${section.index ?? 0}-${i}-${match.cfi}`,
          excerpt: match.excerpt,
          chapterTitle,
          locator: match.cfi,
        })
        if (results.length >= SEARCH_MAX_RESULTS) break
      }
    }
    catch (error) {
      if (signal.aborted) throw error
      console.warn(`Failed to search section ${section.href}:`, error)
    }
    finally {
      // Release per-search DOM so memory doesn't grow with each search on
      // large books. Sections already loaded by the rendition are left alone.
      if (!wasLoaded) {
        try {
          section.unload()
        }
        catch {
          // Ignore unload errors
        }
      }
    }
  }
  return results
}

async function handleSearchNavigate(result: ReaderSearchResult) {
  isPageLoading.value = true
  try {
    const cfi = new EpubCFI(result.locator)
    if (cfi.range) cfi.collapse(true)
    await rendition.value?.display(cfi.toString())
  }
  catch (error) {
    console.error('Failed to navigate to search result:', error)
    toast.add({
      title: $t('reader_epub_rendition_display_failed'),
      color: 'error',
      duration: 3000,
      progress: false,
    })
  }
  finally {
    isPageLoading.value = false
  }
  useLogEvent('reader_search_navigate', { nft_class_id: nftClassId.value })
}

function handleMobileTTSClick() {
  if (bookInfo.isAudioHidden.value) {
    toast.add({
      title: $t('reader_text_to_speech_button_disabled_tooltip'),
      duration: 3000,
      progress: false,
    })
    useLogEvent('reader_tts_button_disabled', { nft_class_id: nftClassId.value })
    return
  }
  onClickTTSPlay()
}
async function handleFootnoteReturn() {
  const target = footnoteReturnCfi.value
  if (!target || !rendition.value) return
  if (isPageLoading.value) return
  isPageLoading.value = true
  try {
    await rendition.value.display(target)
    // Keep the button on failure so the user can retry; clear only on success.
    footnoteReturnCfi.value = ''
  }
  catch (error) {
    console.error('Failed to return from footnote:', error)
    toast.add({
      title: $t('reader_epub_rendition_display_failed'),
      color: 'error',
      duration: 3000,
      progress: false,
    })
  }
  finally {
    isPageLoading.value = false
  }
  useLogEvent('reader_footnote_return', { nft_class_id: nftClassId.value })
}

function handleLeftArrowButtonClick() {
  turnPageLeft()
  useLogEvent('reader_navigate_button_arrow')
}

function handleRightArrowButtonClick() {
  turnPageRight()
  useLogEvent('reader_navigate_button_arrow')
}

function checkIsSelectingText() {
  const selection = renditionViewWindow.value?.getSelection()
  return !!selection && selection.toString().length > 0
}

function addAnnotationHighlight(annotation: Annotation) {
  if (!rendition.value) return
  const { cfi, color } = annotation
  if (!cfi || !color) return
  if (renderedHighlights.has(cfi)) return

  try {
    rendition.value.annotations.highlight(
      cfi,
      { id: annotation.id },
      (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
        isAnnotationClickInProgress.value = true
        handleAnnotationClick(annotation.id)
        setTimeout(() => {
          isAnnotationClickInProgress.value = false
        }, 100)
      },
      'highlight',
      { 'fill': ANNOTATION_COLORS_MAP[color], 'fill-opacity': '1' },
    )
    renderedHighlights.add(cfi)
  }
  catch (error) {
    console.warn(`Failed to render annotation ${annotation.id}:`, error)
  }
}

function removeAnnotationHighlight(cfi: string) {
  if (!rendition.value) return
  try {
    rendition.value.annotations.remove(cfi, 'highlight')
  }
  catch {
    // Ignore error if highlight doesn't exist
  }
  renderedHighlights.delete(cfi)
}

let tempHighlightCfi: string | null = null

function removeTempHighlight() {
  if (!tempHighlightCfi || !rendition.value) return
  try {
    rendition.value.annotations.remove(tempHighlightCfi, 'underline')
  }
  catch {
    // Ignore
  }
  tempHighlightCfi = null
}

function addTempHighlight(cfi: string) {
  removeTempHighlight()
  if (!rendition.value) return
  try {
    rendition.value.annotations.underline(cfi, {}, undefined, undefined, {
      'stroke': '#50e3c2',
      'stroke-width': '3px',
    })
    tempHighlightCfi = cfi
  }
  catch {
    // Ignore
  }
}

watch(isAnnotationMenuVisible, (visible) => {
  if (!visible) removeTempHighlight()
})

function renderAnnotations() {
  if (!rendition.value) return

  const activeCfiSet = new Set(annotations.value.map(a => a.cfi))

  // Remove highlights that no longer exist in annotations
  for (const cfi of renderedHighlights) {
    if (!activeCfiSet.has(cfi)) {
      removeAnnotationHighlight(cfi)
    }
  }

  // Add new highlights
  annotations.value.forEach(addAnnotationHighlight)
}

watch(annotations, renderAnnotations)

function handleAnnotationClick(annotationId: string) {
  const annotation = getAnnotationById(annotationId)
  if (annotation && annotation.type === 'highlight' && annotation.text && annotation.color) {
    editingAnnotation.value = annotation
    selectedText.value = annotation.text
    pendingAnnotationColor.value = annotation.color
    isNewAnnotation.value = false
    isAnnotationModalOpen.value = true
  }
}

let isClearingSelection = false

function handleTextSelection(viewWindow: Window) {
  if (isClearingSelection) return

  const selection = viewWindow.getSelection()
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    isAnnotationMenuVisible.value = false
    return
  }

  const text = selection.toString().trim()
  if (!text) {
    isAnnotationMenuVisible.value = false
    return
  }

  try {
    const range = selection.getRangeAt(0)
    // Access via manager to get Contents array
    const contents = rendition.value?.manager?.getContents()
    const content = contents?.[0]
    if (!content) {
      isAnnotationMenuVisible.value = false
      return
    }

    const cfiRange = content.cfiFromRange(range)
    if (!cfiRange) {
      isAnnotationMenuVisible.value = false
      return
    }

    selectedText.value = text.slice(0, ANNOTATION_TEXT_MAX_LENGTH)
    selectedCfi.value = cfiRange
    selectedChapterTitle.value = activeNavItemLabel.value

    const rect = range.getBoundingClientRect()
    const iframe = renditionElement.value?.querySelector('iframe')
    const iframeRect = iframe?.getBoundingClientRect()

    if (iframeRect) {
      annotationMenuPosition.value = {
        x: iframeRect.left + rect.left + rect.width / 2,
        y: iframeRect.top + rect.top,
        yBottom: iframeRect.top + rect.bottom,
      }
    }
    else {
      annotationMenuPosition.value = {
        x: rect.left + rect.width / 2,
        y: rect.top,
        yBottom: rect.bottom,
      }
    }

    // On iOS, clear selection to dismiss native callout menu and add temp highlight
    if (isIOS.value) {
      isClearingSelection = true
      selection.removeAllRanges()
      addTempHighlight(cfiRange)
      setTimeout(() => {
        isClearingSelection = false
      }, SELECTION_CHANGE_DEBOUNCE_MS + 100)
    }

    isAnnotationMenuVisible.value = true
  }
  catch (error) {
    console.warn('Failed to get CFI range:', error)
    isAnnotationMenuVisible.value = false
  }
}

async function handleAnnotationColorSelect(color: AnnotationColor) {
  isAnnotationMenuVisible.value = false

  const existingAnnotation = annotations.value.find(a => a.cfi === selectedCfi.value)
  if (existingAnnotation && existingAnnotation.cfi) {
    const existingCfi = existingAnnotation.cfi
    // Re-render with new color immediately
    removeAnnotationHighlight(existingCfi)
    addAnnotationHighlight({ ...existingAnnotation, color })

    const updated = await updateAnnotation(existingAnnotation.id, { color })
    if (!updated) {
      // Revert to original color
      removeAnnotationHighlight(existingCfi)
      addAnnotationHighlight(existingAnnotation)
      toast.add({
        title: $t('reader_annotations_update_failed'),
        color: 'error',
      })
    }
  }
  else {
    const createData: AnnotationCreateData = {
      type: 'highlight',
      cfi: selectedCfi.value,
      text: selectedText.value,
      color,
      chapterTitle: selectedChapterTitle.value,
    }
    const newAnnotation = createAnnotation(createData)
    if (!newAnnotation.cfi) return
    const newCfi = newAnnotation.cfi
    addAnnotationHighlight(newAnnotation)

    const saved = await saveAnnotation(newAnnotation.id, createData)
    if (saved && saved.type === 'highlight') {
      useLogEvent('annotation_created', { nft_class_id: nftClassId.value })
      // Re-render with server-assigned ID
      removeAnnotationHighlight(newCfi)
      addAnnotationHighlight(saved)
    }
    else {
      removeAnnotationHighlight(newCfi)
      toast.add({
        title: $t('reader_annotations_create_failed'),
        color: 'error',
      })
    }
  }

  renditionViewWindow.value?.getSelection()?.removeAllRanges()
}

async function handleAnnotationAddNote() {
  isAnnotationMenuVisible.value = false

  const existingAnnotation = annotations.value.find(a => a.cfi === selectedCfi.value)
  if (existingAnnotation) {
    editingAnnotation.value = existingAnnotation
    if (existingAnnotation.color) pendingAnnotationColor.value = existingAnnotation.color
    isNewAnnotation.value = false
  }
  else {
    const newAnnotation = createAnnotation({
      type: 'highlight',
      cfi: selectedCfi.value,
      text: selectedText.value,
      color: pendingAnnotationColor.value,
      chapterTitle: selectedChapterTitle.value,
    })
    addAnnotationHighlight(newAnnotation)
    editingAnnotation.value = newAnnotation
    isNewAnnotation.value = true
  }

  isAnnotationModalOpen.value = true
  renditionViewWindow.value?.getSelection()?.removeAllRanges()

  if (!isNewAnnotation.value || !editingAnnotation.value) return

  const newAnnotation = editingAnnotation.value
  if (!newAnnotation.cfi || !newAnnotation.text || !newAnnotation.color) return

  pendingSavePromise.value = saveAnnotation(newAnnotation.id, {
    type: 'highlight',
    cfi: newAnnotation.cfi,
    text: newAnnotation.text,
    color: newAnnotation.color,
    chapterTitle: newAnnotation.chapterTitle,
  })
  const saved = await pendingSavePromise.value
  pendingSavePromise.value = null
  if (saved && saved.type === 'highlight') {
    removeAnnotationHighlight(newAnnotation.cfi)
    addAnnotationHighlight(saved)
    if (editingAnnotation.value?.id === newAnnotation.id) {
      editingAnnotation.value = saved
    }
  }
  else {
    removeAnnotationHighlight(newAnnotation.cfi)
    isAnnotationModalOpen.value = false
    editingAnnotation.value = null
    isNewAnnotation.value = false
    toast.add({
      title: $t('reader_annotations_create_failed'),
      color: 'error',
    })
  }
}

function handleAnnotationReportIssue() {
  isAnnotationMenuVisible.value = false

  const prefillMessage = $t('reader_annotation_report_issue_prefill', {
    text: selectedText.value,
    bookName: bookInfo.name.value,
    chapter: selectedChapterTitle.value,
    bookId: nftClassId.value,
    cfi: selectedCfi.value,
  })

  const subject = $t('reader_annotation_report_issue_email_subject', { bookName: bookInfo.name.value })
  showNewMessageWithVisibility(prefillMessage, subject)

  useLogEvent('reader_annotation_report_issue', {
    nft_class_id: nftClassId.value,
    is_uploaded_book: isUploadedBook.value,
  })

  renditionViewWindow.value?.getSelection()?.removeAllRanges()
}

async function handleAnnotationModalSave(data: { color: AnnotationColor, note: string }) {
  if (!editingAnnotation.value?.cfi) return

  const cfi = editingAnnotation.value.cfi

  // Re-render highlight with new color immediately
  removeAnnotationHighlight(cfi)
  addAnnotationHighlight({ ...editingAnnotation.value, color: data.color })

  // Close modal immediately for better UX
  isAnnotationModalOpen.value = false
  setTimeout(() => {
    editingAnnotation.value = null
    isNewAnnotation.value = false
  }, 300)

  // Wait for initial save to complete so we have the server-assigned ID
  if (pendingSavePromise.value) {
    await pendingSavePromise.value
  }

  // Look up by CFI to get the server-assigned ID
  const current = annotations.value.find(a => a.cfi === cfi)
  if (!current) return

  const result = await updateAnnotation(current.id, {
    color: data.color,
    note: data.note,
  })
  if (!result) {
    removeAnnotationHighlight(cfi)
    const reverted = annotations.value.find(a => a.cfi === cfi)
    if (reverted) addAnnotationHighlight(reverted)
    toast.add({
      title: $t('reader_annotations_update_failed'),
      color: 'error',
    })
  }
}

async function handleAnnotationModalDelete() {
  if (!editingAnnotation.value?.cfi) return

  const cfi = editingAnnotation.value.cfi
  removeAnnotationHighlight(cfi)

  isAnnotationModalOpen.value = false
  setTimeout(() => {
    editingAnnotation.value = null
    isNewAnnotation.value = false
  }, 300)

  // Wait for initial save to complete so we have the server-assigned ID
  if (pendingSavePromise.value) {
    await pendingSavePromise.value
  }

  const current = annotations.value.find(a => a.cfi === cfi)
  if (!current) return

  const success = await deleteAnnotation(current.id)
  if (success) {
    useLogEvent('annotation_deleted', { nft_class_id: nftClassId.value })
  }
  else {
    addAnnotationHighlight(current)
    toast.add({
      title: $t('reader_annotations_delete_failed'),
      color: 'error',
      duration: 3000,
      progress: false,
    })
  }
}

async function handleAnnotationNavigate(annotation: Annotation) {
  isLeftSidebarOpen.value = false
  if (!annotation.cfi) return
  isPageLoading.value = true
  try {
    const cfi = new EpubCFI(annotation.cfi)
    if (cfi.range) {
      cfi.collapse(true)
    }
    await rendition.value?.display(cfi.toString())
  }
  catch (error) {
    console.error('Failed to navigate to annotation:', error)
    toast.add({
      title: $t('reader_annotations_navigate_failed'),
      color: 'error',
      duration: 3000,
      progress: false,
    })
  }
  finally {
    isPageLoading.value = false
  }
}

const currentBookmarkCfi = computed(() => currentPageStartCfi.value || currentCfi.value)
const currentBookmark = computed(() => {
  return bookmarks.value.find(b => b.cfi && isSegmentOnCurrentPage(b.cfi))
})
const isCurrentPageBookmarked = computed(() => !!currentBookmark.value)

async function handleBookmarkToggle() {
  if (currentBookmark.value) {
    const id = currentBookmark.value.id
    const success = await deleteAnnotation(id)
    if (success) {
      useLogEvent('bookmark_deleted', { nft_class_id: nftClassId.value })
    }
    else {
      toast.add({
        title: $t('reader_bookmark_delete_failed'),
        color: 'error',
      })
    }
    return
  }

  if (!currentBookmarkCfi.value) return
  const doc = rendition.value?.manager?.getContents()?.[0]?.document
  const excerpt = doc ? getExcerptForCFI(doc, currentBookmarkCfi.value, ANNOTATION_TEXT_MAX_LENGTH) : ''
  const createData: AnnotationCreateData = {
    type: 'bookmark',
    cfi: currentBookmarkCfi.value,
    chapterTitle: activeNavItemLabel.value,
    ...(excerpt ? { text: excerpt } : {}),
  }
  const optimistic = createAnnotation(createData)
  const saved = await saveAnnotation(optimistic.id, createData)
  if (saved) {
    useLogEvent('bookmark_created', { nft_class_id: nftClassId.value })
  }
  else {
    toast.add({
      title: $t('reader_bookmark_create_failed'),
      color: 'error',
    })
  }
}

async function handleBookmarkNavigate(bookmark: Annotation) {
  isLeftSidebarOpen.value = false
  if (!bookmark.cfi) return
  isPageLoading.value = true
  try {
    const cfi = new EpubCFI(bookmark.cfi)
    if (cfi.range) {
      cfi.collapse(true)
    }
    await rendition.value?.display(cfi.toString())
  }
  catch (error) {
    console.error('Failed to navigate to bookmark:', error)
    toast.add({
      title: $t('reader_annotations_navigate_failed'),
      color: 'error',
      duration: 3000,
      progress: false,
    })
  }
  finally {
    isPageLoading.value = false
  }
}

async function handleBookmarkDelete(bookmark: Annotation) {
  const success = await deleteAnnotation(bookmark.id)
  if (success) {
    useLogEvent('bookmark_deleted', { nft_class_id: nftClassId.value })
  }
  else {
    toast.add({
      title: $t('reader_bookmark_delete_failed'),
      color: 'error',
    })
  }
}

const isShiftPressed = useKeyModifier('Shift')
onKeyStroke('ArrowRight', () => {
  turnPageRight()
  useLogEvent('reader_navigate_key_arrow_horizontal')
})
onKeyStroke('ArrowLeft', () => {
  turnPageLeft()
  useLogEvent('reader_navigate_key_arrow_horizontal')
})
onKeyStroke('ArrowDown', () => {
  nextPage()
  useLogEvent('reader_navigate_key_arrow_vertical')
})
onKeyStroke('ArrowUp', () => {
  prevPage()
  useLogEvent('reader_navigate_key_arrow_vertical')
})
onKeyStroke('Space', () => {
  if (isShiftPressed.value) {
    prevPage()
  }
  else {
    nextPage()
  }
  useLogEvent('reader_navigate_key_space')
})

onBeforeUnmount(() => {
  cleanUpClickListener?.()
  removeSwipeListener?.()
  removeSelectAllByHotkeyListener?.()
  removeFindHotkeyListener?.()
  removeCopyListener?.()
  removeMouseUpListener?.()
  removeSelectionChangeListener?.()
  removeContextMenuListener?.()
  renderedHighlights.clear()
  renditionViewWindow.value = undefined
  rendition.value?.destroy()
  loadedBook.value = undefined
})
</script>

<style>
/* NOTE: In Safari/Brave Browser, .epub-view could be zero width */
.epub-view,
.epub-view > iframe {
  min-width: 100%;
}
</style>
