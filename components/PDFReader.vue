<template>
  <div class="flex flex-col">
    <ReaderHeader
      :book-name="props.bookName"
      :chapter-title="pageDisplayText"
    >
      <template #center>
        <div class="flex items-center gap-2">
          <UButtonGroup>
            <UButton
              icon="i-material-symbols-chevron-left"
              :disabled="isAtFirstPage"
              color="neutral"
              variant="outline"
              @click="previousPage"
            />
            <div class="flex items-center gap-1 px-2 border border-default rounded-[calc(var(--ui-radius)*1.5)]">
              <input
                ref="pageInput"
                :value="currentPage"
                type="number"
                :min="1"
                :max="Math.max(1, totalPages)"
                :disabled="totalPages <= 0"
                :aria-label="$t('reader_page_input_label')"
                :style="{ width: `${Math.max(3, String(totalPages).length)}ch` }"
                class="text-center text-sm bg-transparent outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                @change="onPageInputChange"
                @keydown.enter="($event.target as HTMLInputElement)?.blur()"
              >
              <span class="text-sm text-muted">/ {{ totalPages }}</span>
            </div>
            <UButton
              icon="i-material-symbols-chevron-right"
              :disabled="isAtLastPage"
              color="neutral"
              variant="outline"
              @click="nextPage"
            />
          </UButtonGroup>

          <UButtonGroup>
            <UButton
              icon="i-material-symbols-zoom-out"
              :disabled="scale <= scaleMin"
              color="neutral"
              variant="outline"
              @click="zoomOut"
            />
            <UDropdownMenu
              class="max-phone:hidden"
              :items="scaleMenuItems"
              :ui="{
                item: 'justify-center',
                itemLabel: 'text-center',
                itemTrailing: 'hidden',
              }"
            >
              <UButton
                class="justify-center min-w-[64px]"
                :label="`${Math.round(scale * 100)}%`"
                color="neutral"
                variant="outline"
                :ui="{ label: 'text-center' }"
              />
            </UDropdownMenu>
            <UButton
              icon="i-material-symbols-zoom-in"
              :disabled="scale >= scaleMax"
              color="neutral"
              variant="outline"
              @click="zoomIn"
            />
          </UButtonGroup>
        </div>
      </template>
      <template #trailing>
        <div class="flex items-center gap-2">
          <BottomSlideover
            v-model:open="isMobileTocOpen"
            :title="$t('reader_toc_title')"
            :is-disabled="!outlineItems.length"
          >
            <UButton
              class="laptop:hidden"
              icon="i-material-symbols-format-list-bulleted"
              :disabled="!outlineItems.length"
              variant="ghost"
            />

            <template #body>
              <ul class="divide-gray-500 divide-y">
                <li
                  v-for="(item, index) in outlineItems"
                  :key="index"
                >
                  <UButton
                    :label="item.title"
                    variant="link"
                    :color="isTocItemActive(item.pageNumber) ? 'primary' : 'neutral'"
                    block
                    :ui="{
                      label: 'text-left leading-[44px]',
                      base: 'justify-start pl-6 pr-5.5 py-0',
                    }"
                    :style="item.level > 0 ? { paddingLeft: `${(item.level + 1) * 16}px` } : undefined"
                    @click="() => {
                      isMobileTocOpen = false
                      goToPage(item.pageNumber)
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
          >
            <UButton
              class="max-laptop:hidden"
              icon="i-material-symbols-format-list-bulleted"
              :label="$t('reader_toc_button')"
              :disabled="!outlineItems.length"
              variant="ghost"
            />

            <template #body>
              <ul class="pb-[64px] divide-gray-500 divide-y">
                <li
                  v-for="(item, index) in outlineItems"
                  :key="index"
                >
                  <UButton
                    :label="item.title"
                    variant="link"
                    :color="isTocItemActive(item.pageNumber) ? 'primary' : 'neutral'"
                    block
                    :ui="{
                      label: 'text-left leading-[44px]',
                      base: 'justify-start pl-6 pr-5.5 py-0',
                    }"
                    :style="item.level > 0 ? { paddingLeft: `${(item.level + 1) * 16}px` } : undefined"
                    @click="() => {
                      isDesktopTocOpen = false
                      goToPage(item.pageNumber)
                    }"
                  />
                </li>
              </ul>
            </template>
          </USlideover>
          <UButton
            :class="[
              'laptop:hidden',
              { 'opacity-50 cursor-not-allowed': isAudioHidden },
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
            :disabled="!isAudioHidden"
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
              :disabled="isAudioHidden"
              @click="onClickTTSPlay"
            />
          </UTooltip>
          <USlideover
            :title="$t('reader_display_options_button')"
            :close="{
              color: 'neutral',
              variant: 'outline',
              class: 'rounded-full',
            }"
            side="bottom"
            :overlay="false"
            :ui="{
              content: 'max-w-(--breakpoint-phone) mx-auto rounded-t-lg',
            }"
          >
            <UButton
              icon="i-material-symbols-more-vert"
              variant="ghost"
            />

            <template #body>
              <UTabs
                v-model="pageMode"
                :items="pageModeOptions"
                class="w-full"
                :content="false"
              />

              <div class="flex items-center justify-between gap-4 mt-3 py-3">
                <span class="text-sm">{{ $t('reader_right_to_left') }}</span>
                <USwitch v-model="isRightToLeft" />
              </div>
            </template>
          </USlideover>
        </div>
      </template>
    </ReaderHeader>

    <div class="relative grow">
      <div
        ref="scrollableContainer"
        class="absolute inset-0 overflow-auto"
        @wheel="handleWheel"
      >
        <div
          v-if="isDualPageMode"
          class="flex w-fit mx-auto"
        >
          <div
            :class="[
              ...pagePaddingClasses,
              'pr-2 laptop:pr-2',
            ]"
          >
            <div class="pdf-reader-page relative border shadow-lg bg-white">
              <canvas
                ref="leftCanvas"
                class="block"
              />
              <div
                ref="leftTextLayer"
                class="textLayer"
              />
            </div>
          </div>
          <div
            v-show="!isCoverPage && dualRightPage"
            :class="[
              ...pagePaddingClasses,
              'pl-2 laptop:pl-2',
            ]"
          >
            <div class="pdf-reader-page relative border shadow-lg bg-white">
              <canvas
                ref="rightCanvas"
                class="block"
              />
              <div
                ref="rightTextLayer"
                class="textLayer"
              />
            </div>
          </div>
        </div>
        <div
          v-else
          class="flex w-fit mx-auto"
        >
          <div
            :class="[
              ...pagePaddingClasses,
            ]"
          >
            <div class="pdf-reader-page relative border shadow-lg bg-white">
              <canvas
                ref="singleCanvas"
                class="block"
              />
              <div
                ref="singleTextLayer"
                class="textLayer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist'

interface Props {
  bookName?: string
  pdfBuffer?: ArrayBuffer | null
  isAudioHidden?: boolean
  isTTSExtracting?: boolean
  bookFileCacheKey: string
  bookProgressKeyPrefix: string
  nftClassId: string
}

const props = defineProps<Props>()

const toast = useToast()
const { t: $t } = useI18n()
const bookSettingsStore = useBookSettingsStore()

const pdfjsLib = ref<typeof import('pdfjs-dist') | undefined>(undefined)
const singleCanvas = useTemplateRef<HTMLCanvasElement>('singleCanvas')
const leftCanvas = useTemplateRef<HTMLCanvasElement>('leftCanvas')
const rightCanvas = useTemplateRef<HTMLCanvasElement>('rightCanvas')
const singleTextLayer = useTemplateRef<HTMLDivElement>('singleTextLayer')
const leftTextLayer = useTemplateRef<HTMLDivElement>('leftTextLayer')
const rightTextLayer = useTemplateRef<HTMLDivElement>('rightTextLayer')
const scrollableContainer = useTemplateRef<HTMLDivElement>('scrollableContainer')
const pageInput = useTemplateRef<HTMLInputElement>('pageInput')
const pagePaddingClasses = ['p-4', 'laptop:px-12', 'laptop:pt-6', 'pb-[64px]']

const {
  readingProgress,
} = useReaderProgress({
  nftClassId: props.nftClassId,
  bookProgressKeyPrefix: props.bookProgressKeyPrefix,
})

const currentPage = useSyncedBookSettings({
  nftClassId: props.nftClassId,
  key: 'currentPage',
  defaultValue: 1,
  namespace: 'pdf',
})
const totalPages = ref(0)
const scaleMin = 0.5
const scaleMax = 3.0
const SCALE_DELTA = 1.1
const scale = useSyncedBookSettings({
  nftClassId: props.nftClassId,
  key: 'scale',
  defaultValue: 1.0,
  namespace: 'pdf',
})
const scaleMenuItems = computed<DropdownMenuItem[]>(() => {
  const presets: Array<{ label: string, value: number | string }> = [
    { label: $t('reader_zoom_fit_page'), value: 'page-fit' },
    { label: $t('reader_zoom_fit_width'), value: 'page-width' },
  ]
  const numericValues = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
  for (const value of numericValues) {
    presets.push({ label: `${Math.round(value * 100)}%`, value })
  }
  return presets.map(({ label, value }) => ({
    label,
    onSelect: async () => {
      try {
        if (value === 'page-fit') {
          await zoomToFit('page')
        }
        else if (value === 'page-width') {
          await zoomToFit('width')
        }
        else {
          scale.value = value as number
        }
      }
      catch (error) {
        emit('error', error as Error)
      }
    },
  }))
})

const pdfDocument = shallowRef<PDFDocumentProxy>()
const textContentCache = new Map<number, Awaited<ReturnType<PDFPageProxy['getTextContent']>>>()
const renderQueue = ref<(() => Promise<void>)[]>([])
const isRendering = ref(false)
const hasAutoZoomedToPage = ref(false)
const isDualPageMode = useSyncedBookSettings({
  nftClassId: props.nftClassId,
  key: 'isDualPageMode',
  defaultValue: true,
  namespace: 'pdf',
})
const pageMode = computed({
  get: () => isDualPageMode.value ? 'dual' : 'single',
  set: (value) => {
    togglePageMode(value)
  },
})
const pageModeOptions = computed(() => [
  {
    value: 'single',
    label: $t('reader_page_mode_single'),
    icon: 'i-material-symbols-stay-current-landscape-outline',
  },
  {
    value: 'dual',
    label: $t('reader_page_mode_dual'),
    icon: 'i-material-symbols-splitscreen-landscape-outline-rounded',
  },
])
const isRightToLeft = useSyncedBookSettings({
  nftClassId: props.nftClassId,
  key: 'isRightToLeft',
  defaultValue: false,
  namespace: 'pdf',
})

interface OutlineItem {
  title: string
  pageNumber: number
  level: number
}

const outlineItems = ref<OutlineItem[]>([])
const isTocOpen = ref(false)
const isDesktop = useDesktopScreen()
watch(isDesktop, () => {
  isTocOpen.value = false
})
const isDesktopTocOpen = computed({
  get: () => isDesktop.value && isTocOpen.value,
  set: (open) => { isTocOpen.value = open },
})
const isMobileTocOpen = computed({
  get: () => !isDesktop.value && isTocOpen.value,
  set: (open) => { isTocOpen.value = open },
})

const emit = defineEmits<{
  error: [error: Error]
  pdfLoaded: [pdfDocument: PDFDocumentProxy]
  ttsPlay: []
  pageChanged: [pageNumber: number]
}>()

const {
  activeTTSLanguageVoiceAvatar,
  activeTTSLanguageVoiceLabel,
} = useTTSVoice()

const { pixelRatio } = useDevicePixelRatio()

const isMobile = useMediaQuery('(max-width: 768px)')

const isCoverPage = computed(() =>
  isDualPageMode.value && totalPages.value > 1 && currentPage.value === 1,
)

const dualRightPage = computed(() => {
  if (!isDualPageMode.value || totalPages.value <= 1 || isCoverPage.value) return undefined
  const right = currentPage.value + 1
  return right <= totalPages.value ? right : undefined
})

function isTocItemActive(pageNumber: number) {
  return pageNumber === currentPage.value || pageNumber === dualRightPage.value
}

const pageDisplayText = computed(() => {
  const right = dualRightPage.value
  if (right) return `${currentPage.value}-${right} / ${totalPages.value}`
  return `${currentPage.value} / ${totalPages.value}`
})

const isAtFirstPage = computed(() => currentPage.value <= 1)
const isAtLastPage = computed(() =>
  (dualRightPage.value ?? currentPage.value) >= totalPages.value,
)

async function loadPDFLib() {
  if (pdfjsLib.value) return pdfjsLib.value

  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  pdfjsLib.value = pdfjs
  return pdfjs
}

onMounted(async () => {
  try {
    await loadPDFLib()
    await bookSettingsStore.ensureInitialized(props.nftClassId)
    isDualPageMode.value = !isMobile.value
    await loadPDF()
  }
  catch (error) {
    emit('error', error as Error)
  }
})

onBeforeUnmount(() => {
  renderQueue.value = []
  textContentCache.clear()
  pdfDocument.value?.destroy()
  pdfDocument.value = undefined
})

watch(isMobile, async (value) => {
  if (value && isDualPageMode.value) {
    isDualPageMode.value = false
  }
})

watch(isDualPageMode, (value) => {
  if (value && currentPage.value > 1 && currentPage.value % 2 === 1) {
    currentPage.value -= 1
  }
})

watch(() => props.pdfBuffer, async () => {
  if (props.pdfBuffer) {
    await loadPDF()
  }
})

watch([scale, isDualPageMode, isRightToLeft], async () => {
  if (pdfDocument.value) {
    await nextTick()
    renderPages()
  }
})

watch([currentPage], async () => {
  if (pdfDocument.value) {
    await nextTick()
    renderPages()
    emit('pageChanged', currentPage.value)
    if (totalPages.value > 0) {
      readingProgress.value = currentPage.value / totalPages.value
    }
  }
})

const debouncedAutoZoom = useDebounceFn(async () => {
  if (!pdfDocument.value) return
  hasAutoZoomedToPage.value = false
  try {
    await autoZoomToPageIfNeeded()
  }
  catch (error) {
    emit('error', error as Error)
  }
}, 150)

useResizeObserver(scrollableContainer, debouncedAutoZoom)

async function loadPDF() {
  if (!props.pdfBuffer) return

  if (!pdfjsLib.value) {
    await loadPDFLib()
  }

  if (!pdfjsLib.value) {
    console.error('PDF.js library not loaded')
    return
  }

  if (pdfDocument.value) {
    pdfDocument.value.destroy()
    pdfDocument.value = undefined
  }

  try {
    const loadingTask = pdfjsLib.value.getDocument({
      data: props.pdfBuffer,
      wasmUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.value.version}/wasm/`,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.value.version}/cmaps/`,
      cMapPacked: true,
    })

    pdfDocument.value = await loadingTask.promise
    totalPages.value = pdfDocument.value.numPages

    outlineItems.value = []
    textContentCache.clear()
    emit('pdfLoaded', pdfDocument.value)
    loadOutline(pdfDocument.value)

    await autoZoomToPageIfNeeded()
    renderPages()
  }
  catch (error) {
    emit('error', error as Error)
  }
}

async function loadOutline(doc: PDFDocumentProxy) {
  try {
    const outline = await doc.getOutline()
    if (!outline?.length) {
      outlineItems.value = []
      return
    }

    type OutlineEntry = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number]
    async function resolvePageNumber(entry: Pick<OutlineEntry, 'dest'>): Promise<number | null> {
      if (!entry.dest) return null
      try {
        const dest = typeof entry.dest === 'string'
          ? await doc.getDestination(entry.dest)
          : entry.dest
        if (dest?.[0]) {
          return (await doc.getPageIndex(dest[0])) + 1
        }
      }
      catch {
        // Skip entries with unresolvable destinations
      }
      return null
    }

    async function flatten(
      entries: typeof outline,
      level: number,
    ): Promise<OutlineItem[]> {
      const resolved = await Promise.all(
        entries.map(entry => resolvePageNumber(entry)),
      )
      const childResults = await Promise.all(
        entries.map((entry): Promise<OutlineItem[]> | OutlineItem[] =>
          entry.items?.length ? flatten(entry.items, level + 1) : [],
        ),
      )
      const items: OutlineItem[] = []
      entries.forEach((entry, i) => {
        const pageNumber = resolved[i]
        if (pageNumber != null) {
          items.push({ title: entry.title, pageNumber, level })
        }
        const children = childResults[i]
        if (children?.length) {
          items.push(...children)
        }
      })
      return items
    }

    const items = await flatten(outline, 0)
    if (pdfDocument.value === doc) {
      outlineItems.value = items
    }
  }
  catch {
    if (pdfDocument.value === doc) {
      outlineItems.value = []
    }
  }
}

function clampScale(value: number) {
  return Math.min(scaleMax, Math.max(scaleMin, value))
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100
}

function getContainerInnerSize() {
  const container = scrollableContainer.value
  if (!container) return null
  const style = getComputedStyle(container)
  const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const height = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  return (width > 0 && height > 0) ? { width, height } : null
}

async function autoZoomToPageIfNeeded() {
  if (!pdfDocument.value || hasAutoZoomedToPage.value) return
  if (scale.value !== 1.0) return

  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => resolve(true)))

  const size = getContainerInnerSize()
  if (!size) return

  const isDual = isDualPageMode.value && totalPages.value > 1 && !isCoverPage.value
  if (isDual) {
    const rightPageNum = dualRightPage.value
    const pagePromises = [pdfDocument.value.getPage(currentPage.value)]
    if (rightPageNum) pagePromises.push(pdfDocument.value.getPage(rightPageNum))
    const pages = await Promise.all(pagePromises)

    const viewports = pages.map(page => page.getViewport({ scale: 1 }))
    const totalWidth = viewports.reduce((sum, viewport) => sum + viewport.width, 0)
    const maxHeight = Math.max(...viewports.map(viewport => viewport.height))
    const effectiveScale = Math.min(size.width / totalWidth, size.height / maxHeight)
    const fitScale = clampScale(roundScale(effectiveScale))

    scale.value = fitScale
    hasAutoZoomedToPage.value = true
    pages.forEach(page => page.cleanup())
    return
  }

  const page = await pdfDocument.value.getPage(currentPage.value)
  const viewport = page.getViewport({ scale: 1 })
  const effectiveScale = Math.min(size.width / viewport.width, size.height / viewport.height)
  const fitScale = clampScale(roundScale(effectiveScale))

  scale.value = fitScale
  hasAutoZoomedToPage.value = true
  page.cleanup()
}

async function zoomToFit(mode: 'page' | 'width') {
  if (!pdfDocument.value) return

  const size = getContainerInnerSize()
  if (!size) return

  const page = await pdfDocument.value.getPage(currentPage.value)
  const viewport = page.getViewport({ scale: 1 })

  let pageWidthScaleFactor = 1
  if (dualRightPage.value) {
    pageWidthScaleFactor = 2
  }

  const pageWidthScale = size.width / viewport.width / pageWidthScaleFactor
  if (mode === 'width') {
    scale.value = clampScale(roundScale(pageWidthScale))
  }
  else {
    const pageHeightScale = size.height / viewport.height
    scale.value = clampScale(roundScale(Math.min(pageWidthScale, pageHeightScale)))
  }

  page.cleanup()
}

async function renderPages() {
  if (!pdfDocument.value) return

  const newRenderTask = async () => {
    try {
      if (isDualPageMode.value && totalPages.value > 1) {
        await renderDualPages()
      }
      else {
        await renderSinglePage()
      }
    }
    catch (error) {
      emit('error', error as Error)
    }
  }

  // Only latest render task is meaningful
  renderQueue.value = [newRenderTask]
  processRenderQueue()
}

async function processRenderQueue() {
  if (isRendering.value || renderQueue.value.length === 0) return

  isRendering.value = true

  while (renderQueue.value.length > 0) {
    const task = renderQueue.value.shift()!
    await task()
  }

  isRendering.value = false
}

async function renderTextLayer(
  page: PDFPageProxy,
  viewport: PageViewport,
  container: HTMLDivElement,
) {
  if (!pdfjsLib.value) return
  container.replaceChildren()
  const pageNum = page.pageNumber
  let textContent = textContentCache.get(pageNum)
  if (!textContent) {
    textContent = await page.getTextContent()
    textContentCache.set(pageNum, textContent)
  }
  const textLayer = new pdfjsLib.value.TextLayer({
    textContentSource: textContent,
    container,
    viewport,
  })
  await textLayer.render()
}

async function renderPageToCanvas(
  pageNum: number,
  canvas: HTMLCanvasElement,
  textLayerContainer?: HTMLDivElement | null,
) {
  if (!pdfDocument.value) return
  const page = await pdfDocument.value.getPage(pageNum)
  const viewport = page.getViewport({ scale: scale.value })

  const context = canvas.getContext('2d')
  if (!context) {
    page.cleanup()
    return
  }

  canvas.height = viewport.height * pixelRatio.value
  canvas.width = viewport.width * pixelRatio.value
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  await page.render({
    canvasContext: context,
    transform: pixelRatio.value !== 1
      ? [pixelRatio.value, 0, 0, pixelRatio.value, 0, 0]
      : undefined,
    viewport,
  }).promise

  if (textLayerContainer) {
    await renderTextLayer(page, viewport, textLayerContainer)
  }

  page.cleanup()
}

async function renderSinglePage() {
  if (!singleCanvas.value) return
  await renderPageToCanvas(currentPage.value, singleCanvas.value, singleTextLayer.value)
}

async function renderDualPages() {
  if (!leftCanvas.value || !rightCanvas.value) return

  const rightPageNum = dualRightPage.value

  // In RTL mode with a right page, swap left/right display positions
  const actualLeftPageNum = (isRightToLeft.value && rightPageNum) ? rightPageNum : currentPage.value
  const actualRightPageNum = (isRightToLeft.value && rightPageNum) ? currentPage.value : rightPageNum

  const renderTasks: Promise<void>[] = [
    renderPageToCanvas(actualLeftPageNum, leftCanvas.value, leftTextLayer.value),
  ]

  if (actualRightPageNum) {
    renderTasks.push(
      renderPageToCanvas(actualRightPageNum, rightCanvas.value, rightTextLayer.value),
    )
  }
  else {
    const rightContext = rightCanvas.value.getContext('2d')
    if (rightContext) {
      rightContext.clearRect(0, 0, rightCanvas.value.width, rightCanvas.value.height)
    }
    rightCanvas.value.width = 0
    rightCanvas.value.height = 0
    rightCanvas.value.style.width = '0px'
    rightCanvas.value.style.height = '0px'
    rightTextLayer.value?.replaceChildren()
  }

  await Promise.all(renderTasks)
}

function nextPage() {
  const step = isDualPageMode.value
    ? (currentPage.value === 1 ? 1 : 2)
    : 1
  currentPage.value = Math.min(currentPage.value + step, totalPages.value)
}

function previousPage() {
  const step = isDualPageMode.value
    ? (currentPage.value <= 2 ? 1 : 2)
    : 1
  currentPage.value = Math.max(currentPage.value - step, 1)
}

function togglePageMode(value?: 'single' | 'dual') {
  if (value === undefined) {
    isDualPageMode.value = !isDualPageMode.value
  }
  else {
    isDualPageMode.value = value === 'dual'
  }
  if (isDualPageMode.value && currentPage.value > 1 && currentPage.value % 2 === 1) {
    currentPage.value--
  }
  renderPages()
}

function zoomIn() {
  scale.value = clampScale(roundScale(scale.value * SCALE_DELTA))
}

function zoomOut() {
  scale.value = clampScale(roundScale(scale.value / SCALE_DELTA))
}

function goToPage(pageNumber: number) {
  if (pageNumber >= 1 && pageNumber <= totalPages.value) {
    if (isDualPageMode.value && pageNumber > 1 && pageNumber % 2 === 1) {
      currentPage.value = pageNumber - 1
    }
    else {
      currentPage.value = pageNumber
    }
  }
}

function onPageInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number.parseInt(input.value, 10)
  if (value && value >= 1 && value <= totalPages.value) {
    goToPage(value)
  }
  input.value = String(currentPage.value)
}

function isInteractiveElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A' || el.isContentEditable
}

function handleKeydown(event: KeyboardEvent) {
  if (isInteractiveElement(event.target)) return

  const ctrl = event.ctrlKey || event.metaKey

  switch (event.key) {
    case 'ArrowLeft':
      previousPage()
      break
    case 'ArrowRight':
      nextPage()
      break
    case '+':
    case '=':
      if (ctrl) {
        event.preventDefault()
      }
      zoomIn()
      break
    case '-':
      if (ctrl) {
        event.preventDefault()
      }
      zoomOut()
      break
    case '0':
      if (ctrl) {
        event.preventDefault()
        scale.value = 1.0
      }
      break
    case 'd':
    case 'D':
      if (!isMobile.value) {
        togglePageMode()
      }
      break
    case 'Home':
      event.preventDefault()
      goToPage(1)
      break
    case 'End':
      event.preventDefault()
      goToPage(totalPages.value)
      break
    case ' ':
      event.preventDefault()
      if (event.shiftKey) {
        previousPage()
      }
      else {
        nextPage()
      }
      break
    case 'g':
    case 'G':
      event.preventDefault()
      pageInput.value?.focus()
      pageInput.value?.select()
      break
  }
}

useEventListener('keydown', handleKeydown)

let pinchStartDistance = 0
let pinchStartScale = 1

function getTouchDistance(touches: TouchList) {
  const a = touches[0]!
  const b = touches[1]!
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 2) {
    pinchStartDistance = getTouchDistance(event.touches)
    pinchStartScale = scale.value
  }
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length !== 2) return

  const currentDistance = getTouchDistance(event.touches)

  if (pinchStartDistance === 0) {
    if (currentDistance === 0) return
    pinchStartDistance = currentDistance
    pinchStartScale = scale.value
  }

  if (event.cancelable) event.preventDefault()
  const ratio = currentDistance / pinchStartDistance
  const newScale = clampScale(roundScale(pinchStartScale * ratio))
  if (newScale !== scale.value) {
    scale.value = newScale
  }
}

function handleTouchEnd() {
  pinchStartDistance = 0
}

useEventListener(scrollableContainer, 'touchstart', handleTouchStart, { passive: true })
useEventListener(scrollableContainer, 'touchmove', handleTouchMove, { passive: false })
useEventListener(scrollableContainer, 'touchend', handleTouchEnd)
useEventListener(scrollableContainer, 'touchcancel', handleTouchEnd)

let wheelUnusedTicks = 0

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return

  event.preventDefault()

  const isTrackpadPinch
    = event.ctrlKey
      && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
      && event.deltaX === 0

  if (isTrackpadPinch) {
    const scaleFactor = Math.exp(-event.deltaY / 100)
    scale.value = clampScale(roundScale(scale.value * scaleFactor))
  }
  else {
    const PIXELS_PER_LINE_SCALE = 30
    let delta = -event.deltaY
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE || event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      delta = Math.sign(delta)
    }
    else {
      delta /= PIXELS_PER_LINE_SCALE
    }

    wheelUnusedTicks += delta
    const wholeTicks = Math.trunc(wheelUnusedTicks)
    wheelUnusedTicks -= wholeTicks

    if (wholeTicks !== 0) {
      let s = scale.value
      const count = Math.abs(wholeTicks)
      const factor = wholeTicks > 0 ? SCALE_DELTA : 1 / SCALE_DELTA
      for (let i = 0; i < count; i++) {
        s = clampScale(roundScale(s * factor))
      }
      scale.value = s
    }
  }
}

function handleMobileTTSClick() {
  if (props.isAudioHidden) {
    toast.add({
      title: $t('reader_text_to_speech_button_disabled_tooltip'),
      duration: 3000,
      progress: false,
    })
    useLogEvent('reader_tts_button_disabled', { nft_class_id: props.nftClassId })
    return
  }
  onClickTTSPlay()
}

function onClickTTSPlay() {
  emit('ttsPlay')
}

defineExpose({
  goToPage,
  currentPage: readonly(currentPage),
  totalPages: readonly(totalPages),
})
</script>

<style>
.pdf-reader-page .textLayer {
  position: absolute;
  text-align: initial;
  inset: 0;
  overflow: clip;
  opacity: 1;
  line-height: 1;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  caret-color: CanvasText;
  z-index: 0;
}

.pdf-reader-page .textLayer :is(span, br) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.pdf-reader-page .textLayer > :not(.markedContent),
.pdf-reader-page .textLayer .markedContent span:not(.markedContent) {
  z-index: 1;
}

.pdf-reader-page .textLayer span.markedContent {
  top: 0;
  height: 0;
}

.pdf-reader-page .textLayer span[role='img'] {
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  cursor: default;
}

.pdf-reader-page .textLayer ::selection {
  background: rgba(0 0 255 / 0.25);
  background: color-mix(in srgb, AccentColor, transparent 75%);
}

.pdf-reader-page .textLayer br::selection {
  background: transparent;
}

.pdf-reader-page .textLayer .endOfContent {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: 0;
  cursor: default;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}

.pdf-reader-page .textLayer.selecting .endOfContent {
  top: 0;
}
</style>
