<template>
  <main>
    <BookLoadingScreen
      v-if="isReaderLoading"
      class="absolute inset-0"
      :book-name="bookInfo.name.value"
      :book-cover-src="bookCoverSrc"
      :loading-label="loadingLabel"
    />
    <div class="relative flex flex-col w-full grow">
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
                <div class="flex gap-2 items-center p-6 pt-4">
                  <UButton
                    icon="i-material-symbols-text-decrease-outline-rounded"
                    variant="ghost"
                    @click="decreaseFontSize"
                  />
                  <USelect
                    v-model="fontSize"
                    class="w-full"
                    :items="FONT_SIZE_OPTIONS"
                  />
                  <UButton
                    icon="i-material-symbols-text-increase-rounded"
                    variant="ghost"
                    @click="increaseFontSize"
                  />
                </div>
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
              'bg-white/75',
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
  </main>
</template>

<script setup lang="ts">
import { useStorage, type UseSwipeDirection } from '@vueuse/core'
import ePub, {
  type Rendition as RenditionBase,
  type NavItem,
  type Location,
} from '@likecoin/epubjs'

import type Section from '@likecoin/epubjs/types/section'

declare interface EpubView {
  window: Window
  settings: {
    direction: 'ltr' | 'rtl'
  }
}

declare interface Rendition extends RenditionBase {
  manager?: {
    container: HTMLElement
  }
}

const { loggedIn: hasLoggedIn } = useUserSession()
const route = useRoute()
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account', query: route.query }))
}
const toast = useToast()

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const {
  nftClassId,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
} = useReader()
const { errorModal, handleError } = useErrorHandler()
const {
  shouldShowTTSTryModal,
  showTTSTryModal,
} = useTTSTryModal()

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

const isPageLoading = ref(false)

const { loadingLabel, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
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
const sectionHrefByFilename = ref<Record<string, string>>({})
const navItems = ref<NavItem[]>([])
const activeNavItemLabel = computed(() => {
  const item = navItems.value.find(item => item.href === activeNavItemHref.value)
  return item?.label || ''
})
const activeNavItemHref = ref<string | undefined>()
// TODO: Should hide this index into TTS (player?) composable?
const activeTTSElementIndex = useStorage(getCacheKeyWithSuffix('tts-index'), undefined) as Ref<number | undefined>

const { setTTSSegments, setChapterTitles, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
  onSegmentChange: (segment) => {
    if (segment?.cfi) {
      isPageLoading.value = true
      rendition.value?.display(segment.cfi)
      activeTTSElementIndex.value = segment.index
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
const lastSectionIndex = ref(0)
const percentage = ref(0)
const percentageLabel = computed(() => `${Math.round(percentage.value * 100)}%`)
const isAtLastPage = computed(() => {
  return currentSectionIndex.value >= lastSectionIndex.value && percentage.value >= 1
})
const isAtFirstPage = computed(() => {
  return currentSectionIndex.value === 0 && percentage.value === 0
})
const isRightToLeft = ref(false)
const currentPageStartCfi = ref<string>('')
const currentPageEndCfi = ref<string>('')
const currentPageHref = ref<string>('')
const currentCfi = useStorage(getCacheKeyWithSuffix('cfi'), '')

const FONT_SIZE_OPTIONS = [
  6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72,
]
const DEFAULT_FONT_SIZE_INDEX = 8 // Default to 24px
const fontSize = ref(FONT_SIZE_OPTIONS[DEFAULT_FONT_SIZE_INDEX])
watch(fontSize, (size) => {
  rendition.value?.themes.fontSize(`${size}px`)
})

let cleanUpClickListener: (() => void) | undefined
let removeSwipeListener: (() => void) | undefined
let removeSelectAllByHotkeyListener: (() => void) | undefined
const renditionElement = useTemplateRef<HTMLDivElement>('reader')
const renditionViewWindow = ref<Window | undefined>(undefined)

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
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value, bookFileCacheKey.value)
  if (!buffer) {
    return
  }

  const book = ePub(buffer)
  await book.ready
  const toc = await book.loaded.navigation.then(async (navigation) => {
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
        book.locations.load(locationCache)
        isLocationLoaded = true
      }
    }
    if (!isLocationLoaded) {
      // NOTE: https://github.com/futurepress/epub.js/issues/278
      // Break sections by 1000 chars for calculating percentage
      book.locations.generate(1000).then(() => {
        try {
          if (window.localStorage) {
            window.localStorage.setItem(locationCacheKey, book.locations.save())
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

  book.spine.each((section: Section) => {
    const directories = section.href.split('/')
    const filename = directories.pop()
    if (!filename) return
    sectionHrefByFilename.value[filename] = section.href
  })
  navItems.value = toc.filter((item): item is NavItem => item !== null)

  activeNavItemHref.value = book.spine.first().href
  currentPageHref.value = activeNavItemHref.value
  lastSectionIndex.value = book.spine.last().index

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
  const bodyCSS: Record<string, string> = {
    'color': '#333',
    '-webkit-text-size-adjust': 'none',
    'text-size-adjust': 'none',
    'direction': 'ltr', // Mitigate epubjs mixing up dir & page-progression-direction
  }
  rendition.value.themes.default({ body: bodyCSS })
  rendition.value.themes.fontSize(`${fontSize.value}px`)
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

  rendition.value.on('rendered', (section: Section, view: EpubView) => {
    currentSectionIndex.value = section.index
    isRightToLeft.value = view.settings.direction === 'rtl'
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
          if (checkIsSelectingText()) {
            // Do not navigate when selecting text
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
    percentage.value = book.locations.percentageFromCfi(location.start.cfi)
    currentCfi.value = location.start.cfi
  })

  const { segments: ttsSegments, chapterTitles } = await extractTTSSegments(book)
  setTTSSegments(ttsSegments)
  setChapterTitles(chapterTitles)

  if (shouldShowTTSTryModal.value && !bookInfo.isAudioHidden.value) {
    showTTSTryModal({
      nftClassId: nftClassId.value,
      onVoiceSelected: () => {
        onClickTTSPlay()
      },
    })
  }
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

async function extractTTSSegments(book: ePub.Book) {
  const sectionPromises: Promise<{ segments: TTSSegment[], chapterTitle: string, sectionIndex: number }>[] = []

  book.spine.each((section: Section) => {
    const sectionPromise = (async () => {
      try {
        const chapter = await book.load(section.href)

        if (!(chapter instanceof Document)) {
          console.warn(`No document found for section ${section.href}`)
          return { segments: [], chapterTitle: '', sectionIndex: section.index }
        }

        const chapterTitle = chapter.querySelector('title')?.textContent?.trim() || ''

        const elements = Array.from(
          chapter.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'),
        ).filter(el => !!el.textContent?.trim())

        const segments: TTSSegment[] = []
        elements.forEach((el, elIndex) => {
          const text = el.textContent?.trim() || ''
          const cfi = section.cfiFromElement(el)
          segments.push(
            ...splitTextIntoSegments(text).map((segment, segIndex) => ({
              text: segment,
              id: `${section.index}-${elIndex}-${segIndex}`,
              cfi,
              sectionIndex: section.index,
            })),
          )
        })

        return { segments, chapterTitle, sectionIndex: section.index }
      }
      catch (err) {
        console.warn(`Failed to load section ${section.href}`, err)
        return { segments: [], chapterTitle: '', sectionIndex: section.index }
      }
    })()

    sectionPromises.push(sectionPromise)
  })

  const sectionResults = await Promise.all(sectionPromises)
  const segments = sectionResults.flatMap(result => result.segments)
  const chapterTitles = sectionResults.reduce<Record<number, string>>((acc, result) => {
    acc[result.sectionIndex] = result.chapterTitle
    return acc
  }, {})

  return { segments, chapterTitles }
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
  rendition.value?.next()
}

function prevPage() {
  activeTTSElementIndex.value = undefined
  isPageLoading.value = true
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
  fontSize.value = FONT_SIZE_OPTIONS[index + size] || fontSize.value
}

function increaseFontSize() {
  adjustFontSize(+1)
}

function decreaseFontSize() {
  adjustFontSize(-1)
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

function onClickTTSPlay() {
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
</script>

<style>
/* NOTE: In Safari/Brave Browser, .epub-view could be zero width */
.epub-view,
.epub-view > iframe {
  min-width: 100%;
}
</style>
