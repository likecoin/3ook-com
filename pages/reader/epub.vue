<template>
  <main class="flex flex-col justify-center items-center grow w-full">
    <ReaderLoadingScreen
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

            <UButton
              class="laptop:hidden"
              icon="i-material-symbols-headphones-rounded"
              variant="ghost"
              :disabled="isReaderLoading"
              @click="textToSpeechWIPModal.open"
            />
            <UButton
              class="max-laptop:hidden"
              icon="i-material-symbols-headphones-rounded"
              :label="$t('reader_text_to_speech_button')"
              variant="ghost"
              :disabled="isReaderLoading"
              @click="textToSpeechWIPModal.open"
            />

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
} from 'epubjs'

import type Section from 'epubjs/types/section'
import { WIPModal } from '#components'

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

definePageMeta({ layout: 'reader' })

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
} = useReader()
const errorModal = useErrorModal()
const overlay = useOverlay()

const textToSpeechWIPModal = overlay.create(WIPModal, {
  props: {
    title: $t('reader_text_to_speech_title'),
  },
})

const isReaderLoading = ref(false)
const isDesktopToCOpen = ref(false)

const { loadingLabel, loadFileAsBuffer } = useBookFileLoader()

onMounted(async () => {
  isReaderLoading.value = true
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
  }
  catch (error) {
    await errorModal.open({
      title: $t('error_reader_fetch_metadata_failed'),
      message: (error as Error).message,
      onClose: () => {
        navigateTo(localeRoute({ name: 'bookshelf' }))
      },
    })
    return
  }

  try {
    await loadEPub()
  }
  catch (error) {
    await errorModal.open({
      title: $t('error_reader_load_epub_failed'),
      message: (error as Error).message,
      onClose: () => {
        navigateTo(localeRoute({ name: 'bookshelf' }))
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
  const buffer = await loadFileAsBuffer(bookFileURLWithCORS.value)
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
  })

  rendition.value.on('relocated', (location: Location) => {
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

const isShiftPressed = useKeyModifier('Shift')
onKeyStroke('ArrowRight', handleRightArrowButtonClick)
onKeyStroke('ArrowLeft', handleLeftArrowButtonClick)
onKeyStroke('ArrowDown', nextPage)
onKeyStroke('ArrowUp', prevPage)
onKeyStroke('Space', () => isShiftPressed.value ? prevPage() : nextPage())
</script>
