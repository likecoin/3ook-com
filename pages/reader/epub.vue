<template>
  <main>
    <Transition name="reader-load">
      <BookLoadingScreen
        v-if="isReaderLoading"
        class="absolute inset-0"
        cover-class="mt-[8vh]"
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
      >
        <template #trailing>
          <div class="relative flex justify-end items-center gap-2">
            <BottomSlideover
              v-model:open="isMobileTocOpen"
              :title="$t('reader_toc_title')"
              @update:open="handleMobileTocOpen"
            >
              <UButton
                class="laptop:hidden"
                icon="i-material-symbols-format-list-bulleted"
                :disabled="isReaderLoading || !navItems.length"
                variant="ghost"
              />

              <template #body>
                <ul class="divide-gray-500 divide-y">
                  <li
                    v-for="item in navItems"
                    :key="item.href"
                    :ref="item.href === activeNavItemHref ? 'mobileActiveNavItemElements' : undefined"
                  >
                    <UButton
                      :label="item.label"
                      variant="link"
                      :color="item.href === activeNavItemHref ? 'primary' : 'neutral'"
                      :trailing-icon="item.href === activeNavItemHref ? 'i-material-symbols-visibility-rounded' : undefined"
                      block
                      :ui="{
                        label: 'text-left leading-[44px]',
                        base: 'justify-start pl-6 pr-5.5 py-0',
                      }"
                      @click="() => {
                        isMobileTocOpen = false
                        setActiveNavItem(item)
                      }"
                    />
                  </li>
                </ul>
              </template>
            </BottomSlideover>
            <USlideover
              v-model:open="isDesktopTocOpen"
              :title="$t('reader_toc_title')"
              side="left"
              :close="{
                color: 'neutral',
                variant: 'soft',
                class: 'rounded-full',
              }"
              :overlay="false"
              :ui="{
                header: 'py-3 min-h-14',
                close: 'top-3',
                body: 'p-0 sm:p-0',
                content: 'divide-gray-500 ring-gray-500',
              }"
              @update:open="handleDesktopTocOpen"
            >
              <UButton
                class="max-laptop:hidden"
                icon="i-material-symbols-format-list-bulleted"
                :label="$t('reader_toc_button')"
                :disabled="!navItems.length"
                variant="ghost"
              />

              <template #body>
                <ul class="pb-[64px] divide-gray-500 divide-y">
                  <li
                    v-for="item in navItems"
                    :ref="item.href === activeNavItemHref ? 'desktopActiveNavItemElements' : undefined"
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
                        isDesktopTocOpen = false
                        setActiveNavItem(item)
                      }"
                    />
                  </li>
                </ul>
              </template>
            </USlideover>
            <UButton
              :class="[
                'laptop:hidden',
                { 'opacity-50 cursor-not-allowed': isReaderLoading || bookInfo.isAudioHidden.value },
              ]"
              :avatar="{
                src: activeTTSLanguageVoiceAvatar,
                alt: activeTTSLanguageVoiceLabel,
              }"
              trailing-icon="i-material-symbols-play-arrow-rounded"
              variant="ghost"
              color="neutral"
              :loading="isTTSExtracting"
              @click="handleMobileTTSClick"
            />
            <UTooltip
              :disabled="!bookInfo.isAudioHidden.value"
              :text="$t('reader_text_to_speech_button_disabled_tooltip')"
            >
              <UButton
                :ui="{
                  base: '!rounded-l-md',
                }"
                class="max-laptop:hidden"
                :avatar="{
                  src: activeTTSLanguageVoiceAvatar,
                  alt: activeTTSLanguageVoiceLabel,
                }"
                trailing-icon="i-material-symbols-play-arrow-rounded"
                :label="$t('reader_text_to_speech_button')"
                variant="ghost"
                color="neutral"
                :loading="isTTSExtracting"
                :disabled="isReaderLoading || bookInfo.isAudioHidden.value"
                @click="onClickTTSPlay"
              />
            </UTooltip>

            <BottomSlideover :title="$t('reader_display_options_button')">
              <UButton
                icon="i-material-symbols-text-fields"
                variant="ghost"
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

            <BottomSlideover
              v-model:open="isAnnotationsListOpen"
              :title="$t('reader_annotations_title')"
            >
              <UButton
                icon="i-material-symbols-edit-note-rounded"
                variant="ghost"
              />

              <template #body>
                <AnnotationsList
                  :annotations="annotations"
                  @navigate="handleAnnotationNavigate"
                />
              </template>
            </BottomSlideover>
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
                { 'opacity-0 pointer-events-none': isRightToLeft ? isAtLastPage : isAtFirstPage },
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
                { 'opacity-0 pointer-events-none': isRightToLeft ? isAtFirstPage : isAtLastPage },
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
              class="animate-spin size-12"
              name="i-material-symbols-refresh-rounded"
            />
          </div>
        </div>

        <span
          v-if="!isReaderLoading"
          class="absolute bottom-6 right-12 text-xs"
          v-text="percentageLabel"
        />
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
import { ANNOTATION_COLORS_MAP, ANNOTATION_TEXT_MAX_LENGTH } from '~/constants/annotations'

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

const { fetchCustomVoice } = useCustomVoice()
onMounted(() => {
  if (hasLoggedIn.value) {
    fetchCustomVoice()
  }
})
const toast = useToast()
const { value: colorModeValue } = useColorModeSync()
const { t: $t } = useI18n()
const nftStore = useNFTStore()
const bookSettingsStore = useBookSettingsStore()
const {
  nftClassId,
  isUploadedBook,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
  bookProgressKeyPrefix,
} = useReader()
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
  annotations,
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

const isTocOpen = ref(false)
const isDesktop = useDesktopScreen()
watch(isDesktop, async () => {
  // Close the TOC when switching to desktop/mobile
  isTocOpen.value = false
})
const isDesktopTocOpen = computed({
  get: () => isDesktop.value && isTocOpen.value,
  set: (open) => {
    isTocOpen.value = open
  },
})
const isMobileTocOpen = computed({
  get: () => !isDesktop.value && isTocOpen.value,
  set: (open) => {
    isTocOpen.value = open
  },
})

const { isIOS, isAndroid, isApp } = useAppDetection()

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
const isAnnotationsListOpen = ref(false)
const isAnnotationClickInProgress = ref(false)
const pendingSavePromise = ref<Promise<Annotation | null> | null>(null)
const renderedHighlights = new Set<string>()

const { loadingLabel, loadingPercentage, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  try {
    const initPromises: Promise<unknown>[] = [
      bookSettingsStore.ensureInitialized(nftClassId.value),
      fetchAnnotations(),
    ]
    if (isUploadedBook.value) {
      const uploadedBooksStore = useUploadedBooksStore()
      if (!uploadedBooksStore.hasFetched) {
        initPromises.push(uploadedBooksStore.fetchItems())
      }
    }
    else {
      initPromises.push(nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value))
    }
    await Promise.all(initPromises)
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_reader_fetch_metadata_failed'),
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
    return
  }

  try {
    await loadEPub()
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_reader_load_epub_failed'),
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
    return
  }
  isReaderLoading.value = false
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
const epubCFI = new EpubCFI()

function isSegmentOnCurrentPage(segmentCfi: string): boolean {
  if (!currentPageStartCfi.value || !currentPageEndCfi.value) return false
  try {
    return epubCFI.compare(segmentCfi, currentPageStartCfi.value) >= 0
      && epubCFI.compare(segmentCfi, currentPageEndCfi.value) <= 0
  }
  catch {
    return false
  }
}

const { isTTSQueryParam, setTTSQueryParam } = useTTSQueryParam()

const { setTTSSegments, setChapterTitles, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
  onClose: () => setTTSQueryParam(false),
  onSegmentChange: async (segment) => {
    if (!segment?.cfi) return
    activeTTSElementIndex.value = segment.index

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

const {
  activeTTSLanguageVoiceAvatar,
  activeTTSLanguageVoiceLabel,
} = useTTSVoice({
  bookLanguage: bookInfo.inLanguage.value,
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
const COPY_CHAR_LIMIT = 100
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

const DEFAULT_WRITING_MODE = EPUB_WRITING_MODES.horizontal
const writingMode = useSyncedBookSettings<EpubWritingMode>({
  nftClassId: nftClassId.value,
  key: 'writingMode',
  defaultValue: DEFAULT_WRITING_MODE,
  namespace: 'epub',
})
const isRightToLeft = computed(() => writingMode.value === EPUB_WRITING_MODES.vertical)

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
  const writingModeStyles = getWritingModeStyles()
  const bodyCSS: Record<string, string> = {
    'color': isDarkMode ? '#f9f9f9 !important' : '#333',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'direction': 'ltr',
    ...writingModeStyles,
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
  rendition.value.themes.default({
    'html': writingModeStyles,
    'body': bodyCSS,
    'p, div, span, h1, h2, h3, h4, h5, h6, li': textCSS,
    'a': anchorCSS,
  })
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
let removeCopyListener: (() => void) | undefined
let removeMouseUpListener: (() => void) | undefined
let removeSelectionChangeListener: (() => void) | undefined
let removeContextMenuListener: (() => void) | undefined
const { isIntercomVisible, markIntercomVisible } = useIntercomVisibility()
useHead({
  htmlAttrs: {
    class: computed(() => (isIntercomVisible.value ? 'intercom-visible' : '')),
  },
})
const renditionElement = useTemplateRef<HTMLDivElement>('reader')
const renditionViewWindow = ref<Window | undefined>(undefined)

async function rerenderRenditionAtCurrentLocation() {
  if (!rendition.value) return

  const target = currentCfi.value || currentPageStartCfi.value || activeNavItemHref.value
  renderedHighlights.clear()
  isPageLoading.value = true
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
    const directories = section.href.split('/')
    const filename = directories.pop()
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
  applyTheme()
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

  rendition.value.on('rendered', (section: Section, view: EpubView) => {
    currentSectionIndex.value = section.index ?? 0
    renditionViewWindow.value = view.window
    isPageLoading.value = false

    if (cleanUpClickListener) {
      cleanUpClickListener()
    }
    cleanUpClickListener = useEventListener(view.window, 'click', (event) => {
      for (const element of event.composedPath() as HTMLElement[]) {
        // NOTE: Ignore clicks on links
        if (element.tagName === 'A') {
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
    const href = location.start.href
    currentPageHref.value = href
    if (navItems.value.some(item => item.href === href)) {
      activeNavItemHref.value = href
    }
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

      elements.forEach((el, elIndex) => {
        const clone = el.cloneNode(true) as Element
        // Remove inline footnote markers in a single pass
        clone.querySelectorAll('a[role="doc-noteref"], .footnote-number, a > sup').forEach((node) => {
          if (node.tagName === 'SUP') {
            if (FOOTNOTE_SUP_RE.test(node.textContent?.trim() || '')) node.parentElement?.remove()
          }
          else { node.remove() }
        })
        // Remove epub:type="noteref" elements (namespaced attr not selectable via CSS)
        clone.querySelectorAll('a, span').forEach((child) => {
          if (child.getAttribute('epub:type') === 'noteref') child.remove()
        })
        const text = clone.textContent?.trim() || ''
        const cfi = section.cfiFromElement(el)
        segments.push(
          ...splitTextIntoSegments(text).map((segment, segIndex) => ({
            text: segment,
            id: `${section.index}-${elIndex}-${segIndex}`,
            cfi,
            sectionIndex: section.index ?? 0,
            elementIndex: elIndex,
          })),
        )
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

  let hasDisplayed = await displayRendition(item.href, { isSilentError: true })
  if (hasDisplayed) return

  // Try replacing nav item's href with spine's href if section cannot be found
  const [filename, anchor] = item.href.split('#')
  if (filename) {
    let spineHref = sectionHrefByFilename.value[filename]
    if (spineHref) {
      if (anchor) {
        spineHref = `${spineHref}#${anchor}`
      }
      hasDisplayed = await displayRendition(spineHref, { isSilentError })
      if (hasDisplayed) {
        return
      }
    }
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
  if (isRightToLeft.value) {
    nextPage()
  }
  else {
    prevPage()
  }
}

function turnPageRight() {
  if (isRightToLeft.value) {
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
  if (mode === writingMode.value) return

  writingMode.value = mode
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
  writingMode.value = DEFAULT_WRITING_MODE
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

const desktopActiveNavItemElements = useTemplateRef<HTMLLIElement[]>('desktopActiveNavItemElements')

async function handleDesktopTocOpen(open: boolean) {
  if (open) {
    useLogEvent('reader_toc_open', { nft_class_id: nftClassId.value })
    await nextTick()
    const element = desktopActiveNavItemElements.value?.[0]
    if (element) {
      // Scroll the active nav item to the center of the desktop screen
      element.scrollIntoView({ block: 'center', inline: 'center' })
    }
  }
}

const mobileActiveNavItemElements = useTemplateRef<HTMLLIElement[]>('mobileActiveNavItemElements')

async function handleMobileTocOpen(open: boolean) {
  if (open) {
    useLogEvent('reader_toc_open', { nft_class_id: nftClassId.value })
    await nextTick()
    const element = mobileActiveNavItemElements.value?.[0]
    if (element) {
      // Scroll the active nav item to the center of the mobile screen
      element.scrollIntoView({ block: 'center', inline: 'center' })
    }
  }
}

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
    cfi: currentPageStartCfi.value,
  })
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
  if (renderedHighlights.has(annotation.cfi)) return

  try {
    rendition.value.annotations.highlight(
      annotation.cfi,
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
      { 'fill': ANNOTATION_COLORS_MAP[annotation.color], 'fill-opacity': '1' },
    )
    renderedHighlights.add(annotation.cfi)
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
  if (annotation) {
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
  if (existingAnnotation) {
    // Re-render with new color immediately
    removeAnnotationHighlight(existingAnnotation.cfi)
    addAnnotationHighlight({ ...existingAnnotation, color })

    const updated = await updateAnnotation(existingAnnotation.id, { color })
    if (!updated) {
      // Revert to original color
      removeAnnotationHighlight(existingAnnotation.cfi)
      addAnnotationHighlight(existingAnnotation)
      toast.add({
        title: $t('reader_annotations_update_failed'),
        color: 'error',
      })
    }
  }
  else {
    const createData: AnnotationCreateData = {
      cfi: selectedCfi.value,
      text: selectedText.value,
      color,
      chapterTitle: selectedChapterTitle.value,
    }
    const newAnnotation = createAnnotation(createData)
    addAnnotationHighlight(newAnnotation)

    const saved = await saveAnnotation(newAnnotation.id, createData)
    if (saved) {
      useLogEvent('annotation_created', { nft_class_id: nftClassId.value })
      // Re-render with server-assigned ID
      removeAnnotationHighlight(newAnnotation.cfi)
      addAnnotationHighlight(saved)
    }
    else {
      removeAnnotationHighlight(newAnnotation.cfi)
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
    pendingAnnotationColor.value = existingAnnotation.color
    isNewAnnotation.value = false
  }
  else {
    const newAnnotation = createAnnotation({
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
  pendingSavePromise.value = saveAnnotation(newAnnotation.id, {
    cfi: newAnnotation.cfi,
    text: newAnnotation.text,
    color: newAnnotation.color,
    chapterTitle: newAnnotation.chapterTitle,
  })
  const saved = await pendingSavePromise.value
  pendingSavePromise.value = null
  if (saved) {
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

  if (!isApp.value && window?.Intercom) {
    markIntercomVisible()
    window.Intercom('showNewMessage', prefillMessage)
  }
  else {
    const subject = $t('reader_annotation_report_issue_email_subject', { bookName: bookInfo.name.value })
    const mailto = `mailto:cs@3ook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(prefillMessage)}`
    window.open(mailto, '_blank')
  }

  useLogEvent('reader_annotation_report_issue', {
    nft_class_id: nftClassId.value,
    is_uploaded_book: isUploadedBook.value,
  })

  renditionViewWindow.value?.getSelection()?.removeAllRanges()
}

async function handleAnnotationModalSave(data: { color: AnnotationColor, note: string }) {
  if (!editingAnnotation.value) return

  const { cfi } = editingAnnotation.value

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
  if (!editingAnnotation.value) return

  const { cfi } = editingAnnotation.value
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
  isAnnotationsListOpen.value = false
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
