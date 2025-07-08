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
            <UPopover>
              <UButton
                class="laptop:hidden"
                icon="i-material-symbols-format-list-bulleted"
                :disabled="isReaderLoading || !navItems.length"
                variant="ghost"
              />

              <template #content>
                <div class="flex flex-col">
                  <div
                    class="px-4 py-2 text-gray-400 text-xs font-semibold"
                    v-text="$t('reader_toc_title')"
                  />

                  <ul>
                    <li
                      v-for="item in navItems"
                      :key="item.href"
                      class="border-t-[0.5px] border-[#11111140]"
                    >
                      <UButton
                        class="w-full"
                        :label="item.label"
                        :disabled="item.href === activeNavItemHref"
                        variant="link"
                        color="neutral"
                        :ui="{ label: 'leading-[44px]', base: 'px-4 py-0' }"
                        @click="setActiveNavItemHref(item.href)"
                      />
                    </li>
                  </ul>
                </div>
              </template>
            </UPopover>
            <UButton
              class="max-laptop:hidden"
              icon="i-material-symbols-format-list-bulleted"
              :label="$t('reader_toc_button')"
              :disabled="!navItems.length"
              variant="ghost"
              @click="isDesktopToCOpen = !isDesktopToCOpen"
            />
            <template v-if="!bookInfo.isAudioHidden.value">
              <template v-if="!isTextToSpeechOn || !isTextToSpeechPlaying">
                <UButton
                  class="laptop:hidden"
                  icon="i-material-symbols-headphones-rounded"
                  variant="ghost"
                  :disabled="isReaderLoading"
                  @click="startTextToSpeech"
                />
                <UButton
                  class="max-laptop:hidden"
                  icon="i-material-symbols-headphones-rounded"
                  :label="$t('reader_text_to_speech_button')"
                  variant="ghost"
                  :disabled="isReaderLoading"
                  @click="startTextToSpeech"
                />
              </template>
              <template v-else>
                <UButton
                  class="laptop:hidden"
                  icon="i-material-symbols-pause-rounded"
                  variant="ghost"
                  @click="pauseTextToSpeech"
                />
                <UButton
                  class="max-laptop:hidden"
                  icon="i-material-symbols-pause-rounded"
                  :label="$t('reader_text_to_speech_button')"
                  variant="ghost"
                  @click="pauseTextToSpeech"
                />
              </template>
              <template v-if="isShowTextToSpeechOptions">
                <UButton
                  icon="i-material-symbols-skip-previous-rounded"
                  variant="ghost"
                  :disabled="!isTextToSpeechOn"
                  @click="skipBackward"
                />
                <USelect
                  v-model="ttsLanguageVoice"
                  :items="ttsLanguageVoiceOptions"
                />
                <USelect
                  v-model="ttsPlaybackRate"
                  icon="i-material-symbols-speed-rounded"
                  :items="ttsPlaybackRateOptions"
                />
                <UButton
                  icon="i-material-symbols-skip-next-rounded"
                  variant="ghost"
                  :disabled="!isTextToSpeechOn"
                  @click="skipForward"
                />
              </template>
            </template>

            <USlideover
              :title="$t('reader_display_options_button')"
              :close="{
                color: 'neutral',
                variant: 'outline',
                class: 'rounded-full',
              }"
              side="bottom"
            >
              <UButton
                class="laptop:hidden"
                icon="i-material-symbols-text-fields"
                variant="ghost"
              />

              <template #body>
                <div class="flex gap-2 items-center">
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
            </USlideover>
            <UPopover>
              <UButton
                class="max-laptop:hidden"
                icon="i-material-symbols-text-fields"
                :label="$t('reader_display_options_button')"
                variant="ghost"
              />

              <template #content>
                <div class="flex gap-2 items-center p-2">
                  <UButton
                    icon="i-material-symbols-text-decrease-outline-rounded"
                    variant="ghost"
                    @click="decreaseFontSize"
                  />
                  <USelect
                    v-model="fontSize"
                    :items="FONT_SIZE_OPTIONS"
                  />
                  <UButton
                    icon="i-material-symbols-text-increase-rounded"
                    variant="ghost"
                    @click="increaseFontSize"
                  />
                </div>
              </template>
            </UPopover>
          </div>
        </template>
      </ReaderHeader>

      <div class="relative flex grow gap-6">
        <nav
          v-if="isDesktopToCOpen"
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
import { useStorage } from '@vueuse/core'
import ePub, {
  type Rendition as RenditionBase,
  type NavItem,
  type Location,
  EpubCFI,
} from 'epubjs'

import type Section from 'epubjs/types/section'

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

const isReaderLoading = ref(false)
const isDesktopToCOpen = ref(false)

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
const textContentElements = ref<{ cfi: string, el: Element, text: string, id: string }[]>([])

const {
  ttsLanguageVoiceOptions,
  ttsLanguageVoice,
  ttsPlaybackRateOptions,
  ttsPlaybackRate,
  isShowTextToSpeechOptions,
  isTextToSpeechOn,
  isTextToSpeechPlaying,
  pauseTextToSpeech,
  startTextToSpeech,
  setTTSSegments,
  skipForward,
  skipBackward,
  restartTextToSpeech,
} = useTextToSpeech({
  nftClassId: nftClassId.value,
  onPlay: (element) => {
    try {
      const textElement = textContentElements.value.find(el => el.id === element.id)
      if (textElement) {
        rendition.value?.display(textElement.cfi)
        rendition.value?.annotations.remove(textElement.cfi, 'highlight')
        rendition.value?.annotations.highlight(textElement.cfi, {}, () => {}, '', {
          fill: '#FFEB3B',
        })
      }
    }
    catch (error) {
      console.warn('Failed to highlight text element:', error)
    }
  },
  onEnd: (element) => {
    try {
      const textElement = textContentElements.value.find(el => el.id === element.id)
      if (textElement) {
        rendition.value?.annotations.remove(textElement.cfi, 'highlight')
      }
    }
    catch (error) {
      console.warn('Failed to remove highlight from text element:', error)
    }
  },
  onPageChange: (direction) => {
    if (direction && direction < 0) {
      prevPage()
    }
    else {
      nextPage()
    }
  },
  checkIfNeededPageChange: (element) => {
    const textElement = textContentElements.value.find(el => el.id === element.id)
    if (textElement) {
      const epubCfi = new EpubCFI(textElement.cfi)
      return epubCfi.compare(epubCfi, currentPageEndCfi.value) >= 0
    }
    return false
  },
})

const navItems = ref<NavItem[]>([])
const activeNavItemLabel = computed(() => {
  const item = navItems.value.find(item => item.href === activeNavItemHref.value)
  return item?.label || ''
})
const activeNavItemHref = ref<string | undefined>()

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
const currentCfi = useStorage(`${bookFileCacheKey.value}-cfi`, '')

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

async function loadEPub() {
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value, bookFileCacheKey.value)
  if (!buffer) {
    return
  }

  const book = ePub(buffer)
  await book.ready
  const [metadata, toc] = await Promise.all([
    book.loaded.metadata,
    book.loaded.navigation.then(async (navigation) => {
      return navigation.toc.flatMap((item) => {
        if (item.subitems) {
          return [item, ...item.subitems]
        }
        return item
      })
    }),
  ])

  try {
    let isLocationLoaded = false
    const locationCacheKey = `${bookFileCacheKey.value}-locations`
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
    color: '#333',
    direction: 'ltr', // Mitigate epubjs mixing up dir & page-progression-direction
  }
  if (metadata.layout === 'pre-paginated' && metadata.spread === 'none') {
    // Make the page centered for book with pre-paginated layout and no spread (single page)
    bodyCSS['transform-origin'] = 'center top !important'
    bodyCSS['margin-left'] = 'auto'
    bodyCSS['margin-right'] = 'auto'
  }
  rendition.value.themes.default({ body: bodyCSS })
  rendition.value.themes.fontSize(`${fontSize.value}px`)
  rendition.value.display(currentCfi.value || undefined)

  rendition.value.on('rendered', (section: Section, view: EpubView) => {
    currentSectionIndex.value = section.index
    const elements = Array.from(section.contents?.querySelectorAll('p, h1, h2, h3, h4, h5, h6') || [])
      .filter(element => !!element.textContent?.trim())
      .map((el) => {
        const range = new Range()
        range.selectNodeContents(el)
        const cfi = section.cfiFromRange(range)
        const text = el.textContent?.trim() || ''
        const segments = splitTextIntoSegments(text)
        return { cfi, el, text, segments }
      })

    textContentElements.value = elements.reduce((acc, element) => {
      return acc.concat(element.segments.map((text, index) => {
        return ({
          cfi: element.cfi,
          el: element.el,
          text,
          id: `${element.cfi}-${index}`,
        })
      }))
    }, [] as { cfi: string, el: Element, text: string, id: string }[])

    const textElements = textContentElements.value.map(el => ({
      id: el.id,
      text: el.text,
    }))
    setTTSSegments(textElements)
    isRightToLeft.value = view.settings.direction === 'rtl'

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

      if (view.window && window.innerWidth < 1024) {
        const width = rendition.value?.manager?.container.clientWidth || 0
        const range = width * (1 / 3)
        const x = event.clientX % width // Normalize x to be within the window
        if (x < range) {
          handleLeftArrowButtonClick()
        }
        else if (width - x < range) {
          handleRightArrowButtonClick()
        }
      }
    })

    if (isTextToSpeechOn.value) {
      restartTextToSpeech()
    }
  })

  rendition.value.on('relocated', (location: Location) => {
    currentPageEndCfi.value = location.end.cfi
    const href = location.start.href
    if (navItems.value.some(item => item.href === href)) {
      activeNavItemHref.value = href
    }
    percentage.value = book.locations.percentageFromCfi(location.start.cfi)
    currentCfi.value = location.start.cfi
  })
}

function setActiveNavItemHref(href: string) {
  activeNavItemHref.value = href
  rendition.value?.display(href)
}

function nextPage() {
  rendition.value?.next()
}

function prevPage() {
  rendition.value?.prev()
}

function handleLeftArrowButtonClick() {
  if (isRightToLeft.value) {
    nextPage()
  }
  else {
    prevPage()
  }
}

function handleRightArrowButtonClick() {
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

const isShiftPressed = useKeyModifier('Shift')
onKeyStroke('ArrowRight', handleRightArrowButtonClick)
onKeyStroke('ArrowLeft', handleLeftArrowButtonClick)
onKeyStroke('ArrowDown', nextPage)
onKeyStroke('ArrowUp', prevPage)
onKeyStroke('Space', () => isShiftPressed.value ? prevPage() : nextPage())
</script>

<style>
/* NOTE: In Safari/Brave Browser, .epub-view could be zero width */
.epub-view,
.epub-view > iframe {
  min-width: 100%
}
</style>
