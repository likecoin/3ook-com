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
              <USelect
                v-if="isShowTextToSpeechOptions"
                v-model="ttsLanguage"
                :items="ttsLanguageOptions"
              />
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

const { loggedIn: hasLoggedIn, user } = useUserSession()
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
const subscription = useSubscription()

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
const textContentElements = ref<{ cfi: string, el: Element, text: string }[]>([])
const ttsLanguageOptions = [
  { label: '粵', value: 'zh-HK' },
  { label: '國', value: 'zh-TW' },
  { label: 'En', value: 'en-US' },
]
const ttsLanguage = ref('zh-HK')
watch(ttsLanguage, (newLanguage, oldLanguage) => {
  if (newLanguage !== oldLanguage) {
    useLogEvent('tts_language_change', {
      nft_class_id: nftClassId,
    })
  }
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

const FONT_SIZE_OPTIONS = [
  6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72,
]
const fontSize = ref(FONT_SIZE_OPTIONS[8])
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
    // NOTE: https://github.com/futurepress/epub.js/issues/278
    // Break sections by 1000 chars for calculating percentage
    book.locations.generate(1000),
  ])

  const sectionHrefByFilename: Record<string, string> = {}
  book.spine.each((section: Section) => {
    const directories = section.href.split('/')
    const filename = directories.pop()
    if (!filename) return
    sectionHrefByFilename[filename] = section.href
  })
  navItems.value = toc.map(item => ({
    ...item,
    href: sectionHrefByFilename[item.href] || item.href,
  }))
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
  rendition.value.display()

  rendition.value.on('rendered', (section: Section, view: EpubView) => {
    currentSectionIndex.value = section.index
    const elements = Array.from(section.contents.querySelectorAll('p, h1, h2, h3, h4, h5, h6'))
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
      return acc.concat(element.segments.map((text) => {
        return ({
          cfi: element.cfi,
          el: element.el,
          text,
        })
      }))
    }, [] as { cfi: string, el: Element, text: string }[])
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
      startTextToSpeech()
    }
  })

  rendition.value.on('relocated', (location: Location) => {
    currentPageEndCfi.value = location.end.cfi
    const href = location.start.href
    if (navItems.value.some(item => item.href === href)) {
      activeNavItemHref.value = href
    }
    percentage.value = book.locations.percentageFromCfi(location.start.cfi)
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
  const index = FONT_SIZE_OPTIONS.indexOf(fontSize.value)
  fontSize.value = FONT_SIZE_OPTIONS[index + size] || fontSize.value
}

function increaseFontSize() {
  adjustFontSize(+1)
}

function decreaseFontSize() {
  adjustFontSize(-1)
}

const isShowTextToSpeechOptions = ref(false)
const isTextToSpeechOn = ref(false)
const isTextToSpeechPlaying = ref(false)
const audioQueue = ref<HTMLAudioElement[]>([])
const currentAudioIndex = ref(0)

function pauseTextToSpeech() {
  if (isTextToSpeechOn.value) {
    if (audioQueue.value[currentAudioIndex.value]) {
      audioQueue.value[currentAudioIndex.value].pause()
    }
    isTextToSpeechPlaying.value = false
    useLogEvent('tts_pause', {
      nft_class_id: nftClassId,
    })
  }
}

function createAudio(element: { cfi: string, el: Element, text: string }) {
  const audio = new Audio()
  const params = new URLSearchParams({
    text: element.text,
    language: ttsLanguage.value,
  })
  audio.src = `/api/reader/tts?${params.toString()}`

  audio.onplay = () => {
    rendition.value?.display(element.cfi)
    rendition.value?.annotations.remove(element.cfi, 'highlight')
    rendition.value?.annotations.highlight(element.cfi, {}, () => {}, '', {
      fill: '#FFEB3B',
    })
  }
  audio.onended = () => {
    rendition.value?.annotations.remove(element.cfi, 'highlight')
    if (audioQueue.value.length < textContentElements.value.length) {
      const nextAudio = createAudio(textContentElements.value[audioQueue.value.length])
      audioQueue.value.push(nextAudio)
    }
    if (currentAudioIndex.value < audioQueue.value.length - 1) {
      currentAudioIndex.value++
      const element = textContentElements.value[currentAudioIndex.value]
      const cfi = new EpubCFI(element.cfi)
      if (cfi.compare(cfi, currentPageEndCfi.value) >= 0) {
        nextPage()
      }
      setTimeout(() => {
        audioQueue.value[currentAudioIndex.value].play()
      }, 200) // Add a small delay since some minimax voice doesn't have gap at the end
    }
    else {
      nextPage()
    }
  }

  audio.onerror = (e) => {
    console.warn('Audio playback error:', e)
  }
  return audio
}

async function startTextToSpeech() {
  if (!user.value?.isLikerPlus) {
    subscription.paywallModal.open()
    return
  }
  isShowTextToSpeechOptions.value = true
  if (!isTextToSpeechPlaying.value) {
    isTextToSpeechPlaying.value = true
    if (audioQueue.value[currentAudioIndex.value]) {
      audioQueue.value[currentAudioIndex.value].play()
      useLogEvent('tts_resume', {
        nft_class_id: nftClassId,
      })
    }
    return
  }

  audioQueue.value.forEach((audio) => {
    audio.pause()
    audio.src = ''
  })
  audioQueue.value = []
  currentAudioIndex.value = 0
  isTextToSpeechOn.value = true
  useLogEvent('tts_start', {
    nft_class_id: nftClassId,
  })

  try {
    // load up to 2 paragraphs for text-to-speech
    for (let i = 0; i < Math.min(2, textContentElements.value.length); i++) {
      const audio = createAudio(textContentElements.value[i])
      audioQueue.value.push(audio)
    }

    if (audioQueue.value.length > 0) {
      audioQueue.value[0].play()
    }
    else {
      nextPage()
    }
  }
  catch (error) {
    isTextToSpeechOn.value = false
    await handleError(error, {
      title: $t('error_text_to_speech_failed'),
    })
  }
}

const isShiftPressed = useKeyModifier('Shift')
onKeyStroke('ArrowRight', handleRightArrowButtonClick)
onKeyStroke('ArrowLeft', handleLeftArrowButtonClick)
onKeyStroke('ArrowDown', nextPage)
onKeyStroke('ArrowUp', prevPage)
onKeyStroke('Space', () => isShiftPressed.value ? prevPage() : nextPage())
</script>
