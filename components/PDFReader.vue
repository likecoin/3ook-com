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
              class="max-phone:hidden"
              icon="i-material-symbols-zoom-out"
              :disabled="scale <= scaleMin"
              color="neutral"
              variant="outline"
              @click="zoomOut"
            />
            <UDropdownMenu
              :items="scaleMenuItems"
              :ui="{
                item: 'justify-center',
                itemLabel: 'text-center',
                itemTrailing: 'hidden',
              }"
            >
              <UButton
                class="justify-center min-w-[64px] max-phone:!rounded-md"
                :label="`${Math.round(scale * 100)}%`"
                color="neutral"
                variant="outline"
                :ui="{ label: 'text-center' }"
              />
            </UDropdownMenu>
            <UButton
              class="max-phone:hidden"
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
      >
        <div
          v-if="isDualPageMode"
          class="flex origin-top-left"
          :style="{ transform: `scale(${scale})` }"
        >
          <div
            :class="[
              ...pagePaddingClasses,
              'pr-2 laptop:pr-2',
            ]"
          >
            <canvas
              ref="leftCanvas"
              class="border shadow-lg bg-white"
            />
          </div>
          <div
            v-show="!isCoverPage"
            :class="[
              ...pagePaddingClasses,
              'pl-2 laptop:pl-2',
            ]"
          >
            <canvas
              ref="rightCanvas"
              class="border shadow-lg bg-white"
            />
          </div>
        </div>
        <div
          v-else
          class="flex"
        >
          <div
            :class="[
              ...pagePaddingClasses,
              'origin-top-left',
            ]"
            :style="{ transform: `scale(${scale})` }"
          >
            <canvas
              ref="singleCanvas"
              class="border shadow-lg bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  bookName?: string
  pdfBuffer: ArrayBuffer
  isAudioHidden?: boolean
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
const scrollableContainer = useTemplateRef<HTMLDivElement>('scrollableContainer')
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
const scaleStep = 0.25
const scale = useSyncedBookSettings({
  nftClassId: props.nftClassId,
  key: 'scale',
  defaultValue: 1.0,
  namespace: 'pdf',
})
const scaleMenuItems = computed<DropdownMenuItem[]>(() => {
  const items: number[] = []
  let step = scaleStep
  for (let value = scaleMin; value <= scaleMax; value += step) {
    items.push(Number(value.toFixed(2)))
    if (value === 1.5) {
      step *= 2
    }
  }
  return items.map(value => ({
    label: `${Math.round(value * 100)}%`,
    onSelect: () => scale.value = value,
  }))
})

const pdfDocument = shallowRef<PDFDocumentProxy>()
const renderQueue = ref<(() => Promise<void>)[]>([])
const isRendering = ref(false)
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

async function loadPDF() {
  if (!props.pdfBuffer) return

  if (!pdfjsLib.value) {
    await loadPDFLib()
  }

  if (!pdfjsLib.value) {
    console.error('PDF.js library not loaded')
    return
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

    emit('pdfLoaded', pdfDocument.value)

    renderPages()
  }
  catch (error) {
    emit('error', error as Error)
  }
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

async function renderSinglePage() {
  if (!pdfDocument.value || !singleCanvas.value) return

  const page = await pdfDocument.value.getPage(currentPage.value)
  const viewport = page.getViewport({ scale: scale.value })

  const context = singleCanvas.value.getContext('2d')
  if (!context) return

  singleCanvas.value.height = viewport.height * pixelRatio.value
  singleCanvas.value.width = viewport.width * pixelRatio.value
  singleCanvas.value.style.width = `${viewport.width}px`
  singleCanvas.value.style.height = `${viewport.height}px`

  const renderContext = {
    canvasContext: context,
    transform: pixelRatio.value !== 1
      ? [pixelRatio.value, 0, 0, pixelRatio.value, 0, 0]
      : undefined,
    viewport: viewport,
  }

  await page.render(renderContext).promise
}

async function renderDualPages() {
  if (!pdfDocument.value || !leftCanvas.value || !rightCanvas.value) return

  const rightPageNum = dualRightPage.value

  const leftContext = leftCanvas.value.getContext('2d')
  const rightContext = rightCanvas.value.getContext('2d')
  if (!leftContext || !rightContext) return

  const renderTasks = []

  // In RTL mode with a right page, swap left/right display positions
  const actualLeftPageNum = (isRightToLeft.value && rightPageNum) ? rightPageNum : currentPage.value
  const actualRightPageNum = (isRightToLeft.value && rightPageNum) ? currentPage.value : rightPageNum

  const leftPageTask = pdfDocument.value.getPage(actualLeftPageNum).then(async (leftPage) => {
    const leftViewport = leftPage.getViewport({ scale: scale.value })
    if (leftCanvas.value) {
      leftCanvas.value.height = leftViewport.height * pixelRatio.value
      leftCanvas.value.width = leftViewport.width * pixelRatio.value
      leftCanvas.value.style.width = `${leftViewport.width}px`
      leftCanvas.value.style.height = `${leftViewport.height}px`
    }
    return leftPage.render({
      canvasContext: leftContext,
      transform: pixelRatio.value !== 1
        ? [pixelRatio.value, 0, 0, pixelRatio.value, 0, 0]
        : undefined,
      viewport: leftViewport,
    }).promise
  })
  renderTasks.push(leftPageTask)

  if (actualRightPageNum) {
    const rightPageTask = pdfDocument.value.getPage(actualRightPageNum).then(async (rightPage) => {
      const rightViewport = rightPage.getViewport({ scale: scale.value })
      if (rightCanvas.value) {
        rightCanvas.value.height = rightViewport.height * pixelRatio.value
        rightCanvas.value.width = rightViewport.width * pixelRatio.value
        rightCanvas.value.style.width = `${rightViewport.width}px`
        rightCanvas.value.style.height = `${rightViewport.height}px`
      }
      return rightPage.render({
        canvasContext: rightContext,
        transform: pixelRatio.value !== 1
          ? [pixelRatio.value, 0, 0, pixelRatio.value, 0, 0]
          : undefined,
        viewport: rightViewport,
      }).promise
    })
    renderTasks.push(rightPageTask)
  }
  else {
    rightContext.clearRect(0, 0, rightCanvas.value.width, rightCanvas.value.height)
    rightCanvas.value.width = 0
    rightCanvas.value.height = 0
    rightCanvas.value.style.width = '0px'
    rightCanvas.value.style.height = '0px'
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
  if (scale.value < scaleMax) {
    scale.value += scaleStep
  }
}

function zoomOut() {
  if (scale.value > scaleMin) {
    scale.value -= scaleStep
  }
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

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
      previousPage()
      break
    case 'ArrowRight':
      nextPage()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case 'd':
    case 'D':
      if (!isMobile.value) {
        togglePageMode()
      }
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

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
