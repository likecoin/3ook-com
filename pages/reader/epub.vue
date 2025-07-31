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
                      :disabled="item.href === activeNavItemHref"
                      variant="link"
                      color="neutral"
                      block
                      :ui="{
                        label: 'text-left leading-[44px]',
                        base: 'justify-start px-4 py-0',
                      }"
                      @click="() => {
                        isMobileTocOpen = false
                        setActiveNavItemHref(item.href)
                      }"
                    />
                  </li>
                </ul>
              </template>
            </BottomSlideover>
            <UButton
              class="max-laptop:hidden"
              icon="i-material-symbols-format-list-bulleted"
              :label="$t('reader_toc_button')"
              :disabled="!navItems.length"
              variant="ghost"
              @click="isDesktopTocOpen = !isDesktopTocOpen"
            />
            <template v-if="!bookInfo.isAudioHidden.value">
              <UButton
                class="laptop:hidden"
                icon="i-material-symbols-play-arrow-rounded"
                variant="ghost"
                color="neutral"
                :disabled="isReaderLoading"
                @click="onClickTTSPlay"
              />
              <UButton
                :ui="{
                  base: '!rounded-l-md',
                }"
                class="max-laptop:hidden"
                icon="i-material-symbols-play-arrow-rounded"
                :label="$t('reader_text_to_speech_button')"
                variant="ghost"
                color="neutral"
                :disabled="isReaderLoading"
                @click="onClickTTSPlay"
              />
            </template>

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

      <div class="relative flex grow gap-6">
        <nav
          v-if="isDesktopTocOpen"
          class="relative max-laptop:hidden w-[312px]"
        >
          <ul class="absolute inset-0 overflow-y-auto pl-12 pr-6 laptop:pt-6 pb-[64px]">
            <li
              v-for="item in navItems"
              :key="item.href"
            >
              <UButton
                class="w-full"
                :label="item.label"
                variant="link"
                color="neutral"
                :ui="{ label: item.href === activeNavItemHref ? 'text-[#1A1A1A]' : '' }"
                @click="setActiveNavItemHref(item.href)"
              />
            </li>
          </ul>
        </nav>

        <div class="relative flex flex-col grow laptop:px-12 laptop:pt-6 pb-[64px]">
          <div class="relative grow w-full max-w-[768px] mx-auto">
            <div
              ref="reader"
              class="absolute inset-0"
            />
          </div>

          <div
            v-if="!isReaderLoading"
            :class="[
              'absolute',
              'inset-0',
              'hidden lg:flex',
              'justify-between',
              'items-center',
              'px-[48px]',
              'pointer-events-none',
            ]"
          >
            <UButton
              :class="[
                'pointer-events-auto',
                { 'opacity-0': isRightToLeft ? isAtLastPage : isAtFirstPage },
              ]"
              icon="i-material-symbols-arrow-back-ios-new-rounded"
              variant="ghost"
              @click="handleLeftArrowButtonClick"
            />
            <UButton
              :class="[
                'pointer-events-auto',
                { 'opacity-0': isRightToLeft ? isAtFirstPage : isAtLastPage },
              ]"
              icon="i-material-symbols-arrow-forward-ios-rounded"
              variant="ghost"
              @click="handleRightArrowButtonClick"
            />
          </div>
        </div>

        <span
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
const localeRoute = useLocaleRoute()
if (!hasLoggedIn.value) {
  await navigateTo(localeRoute({ name: 'account' }))
}

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const {
  nftClassId,
  bookInfo,
  bookCoverSrc,
  bookFileURLWithCORS,
  bookFileCacheKey,
} = useReader()
const { handleError } = useErrorHandler()

function getCacheKeyWithSuffix(suffix: ReaderCacheKeySuffix) {
  return getReaderCacheKeyWithSuffix(bookFileCacheKey.value, suffix)
}

const isReaderLoading = ref(true)
const isDesktopTocOpen = ref(false)
const isMobileTocOpen = ref(false)

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
const navItems = ref<NavItem[]>([])
const activeNavItemLabel = computed(() => {
  const item = navItems.value.find(item => item.href === activeNavItemHref.value)
  return item?.label || ''
})
const activeNavItemHref = ref<string | undefined>()
// TODO: Should hide this index into TTS (player?) composable?
const activeTTSElementIndex = useStorage(getCacheKeyWithSuffix('tts-index'), undefined) as Ref<number | undefined>

const { setTTSSegments, openPlayer } = useTTSPlayerModal({
  nftClassId: nftClassId.value,
  onSegmentChange: (segment) => {
    if (segment?.href) {
      rendition.value?.display(segment.href)
      activeTTSElementIndex.value = segment.index
    }
  },
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
const renditionElement = useTemplateRef<HTMLDivElement>('reader')
const renditionViewWindow = ref<Window | undefined>(undefined)

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

  const sectionHrefByFilename: Record<string, string> = {}
  book.spine.each((section: Section) => {
    const directories = section.href.split('/')
    const filename = directories.pop()
    if (!filename) return
    sectionHrefByFilename[filename] = section.href
  })
  navItems.value = toc
    .map((item: NavItem) => {
      const href = sectionHrefByFilename[item.href]
      return href ? { ...item, href } : null
    })
    .filter((item): item is NavItem => item !== null)
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
  rendition.value.display(currentCfi.value || undefined)

  rendition.value.on('rendered', (section: Section, view: EpubView) => {
    currentSectionIndex.value = section.index
    isRightToLeft.value = view.settings.direction === 'rtl'
    renditionViewWindow.value = view.window

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
  })

  rendition.value.on('relocated', (location: Location) => {
    currentPageEndCfi.value = location.end.cfi
    const href = location.start.href
    currentPageHref.value = href
    if (navItems.value.some(item => item.href === href)) {
      activeNavItemHref.value = href
    }
    percentage.value = book.locations.percentageFromCfi(location.start.cfi)
    currentCfi.value = location.start.cfi
  })

  const ttsSegments = await extractTTSSegments(book)
  setTTSSegments(ttsSegments)
}

async function extractTTSSegments(book: ePub.Book) {
  const sectionPromises: Promise<TTSSegment[]>[] = []

  book.spine.each((section: Section) => {
    const sectionPromise = (async () => {
      try {
        const chapter = await book.load(section.href)

        if (!(chapter instanceof Document)) {
          console.warn(`No document found for section ${section.href}`)
          return []
        }

        const chapterTitle = chapter.querySelector('title')?.textContent?.trim() || ''

        const elements = Array.from(
          chapter.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'),
        ).filter(el => !!el.textContent?.trim())

        const segments: TTSSegment[] = []
        elements.forEach((el, elIndex) => {
          const text = el.textContent?.trim() || ''
          segments.push(
            ...splitTextIntoSegments(text).map((segment, segIndex) => ({
              text: segment,
              id: `${section.index}-${elIndex}-${segIndex}`,
              href: section.href,
              chapterTitle,
            })),
          )
        })

        return segments
      }
      catch (err) {
        console.warn(`Failed to load section ${section.href}`, err)
        return []
      }
    })()

    sectionPromises.push(sectionPromise)
  })

  const ttsSegments = (await Promise.all(sectionPromises)).flat()
  return ttsSegments
}

function setActiveNavItemHref(href: string) {
  activeTTSElementIndex.value = undefined
  activeNavItemHref.value = href
  rendition.value?.display(href)
}

function nextPage() {
  activeTTSElementIndex.value = undefined
  rendition.value?.next()
}

function prevPage() {
  activeTTSElementIndex.value = undefined
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
    index: activeTTSElementIndex.value,
    href: currentPageHref.value,
  })
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

useSwipe(
  renditionViewWindow,
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
)
</script>

<style>
/* NOTE: In Safari/Brave Browser, .epub-view could be zero width */
.epub-view,
.epub-view > iframe {
  min-width: 100%;
}
</style>
