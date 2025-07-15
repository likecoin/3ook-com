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
import { useStorage } from '@vueuse/core'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  bookName?: string
  pdfBuffer: ArrayBuffer
  bookFileCacheKey?: string
}

const props = defineProps<Props>()

const { t: $t } = useI18n()

const pdfjsLib = ref<typeof import('pdfjs-dist') | undefined>(undefined)
const singleCanvas = useTemplateRef<HTMLCanvasElement>('singleCanvas')
const leftCanvas = useTemplateRef<HTMLCanvasElement>('leftCanvas')
const rightCanvas = useTemplateRef<HTMLCanvasElement>('rightCanvas')
const scrollableContainer = useTemplateRef<HTMLDivElement>('scrollableContainer')
const pagePaddingClasses = ['p-4', 'laptop:px-12', 'laptop:pt-6', 'pb-[64px]']

const currentPage = useStorage(computed(() => `${props.bookFileCacheKey}-locations`), 1)
const totalPages = ref(0)
const scaleMin = 0.5
const scaleMax = 3.0
const scaleStep = 0.25
const scale = useStorage(computed(() => `${props.bookFileCacheKey}-scale`), 1.0)
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
const isDualPageMode = useStorage(computed(() => `${props.bookFileCacheKey}-dual-page-mode`), true)
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
const isRightToLeft = useStorage(computed(() => `${props.bookFileCacheKey}-right-to-left`), false)

const emit = defineEmits<{
  error: [error: Error]
}>()

const isMobile = useMediaQuery('(max-width: 768px)')
const pageDisplayText = computed(() => {
  if (isDualPageMode.value && totalPages.value > 1) {
    const leftPage = currentPage.value
    const rightPage = currentPage.value + 1
    if (rightPage <= totalPages.value) {
      return `${leftPage}-${rightPage} / ${totalPages.value}`
    }
  }
  return `${currentPage.value} / ${totalPages.value}`
})

const isAtFirstPage = computed(() => currentPage.value <= 1)
const isAtLastPage = computed(() => {
  let current = currentPage.value
  if (isDualPageMode.value && totalPages.value > 1) {
    current += 1
  }
  return current >= totalPages.value
})

onMounted(async () => {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    pdfjsLib.value = pdfjs
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

watch(() => props.pdfBuffer, async () => {
  if (props.pdfBuffer) {
    await loadPDF()
  }
})

watch([currentPage, scale, isDualPageMode, isRightToLeft], async () => {
  if (pdfDocument.value) {
    await nextTick()
    await renderPages()
  }
})

async function loadPDF() {
  if (!props.pdfBuffer || !pdfjsLib.value) return

  try {
    const loadingTask = pdfjsLib.value.getDocument({
      data: props.pdfBuffer,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.value.version}/cmaps/`,
      cMapPacked: true,
    })

    pdfDocument.value = await loadingTask.promise
    totalPages.value = pdfDocument.value.numPages

    await renderPages()
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

  singleCanvas.value.height = viewport.height
  singleCanvas.value.width = viewport.width

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  }

  await page.render(renderContext).promise
}

async function renderDualPages() {
  if (!pdfDocument.value || !leftCanvas.value || !rightCanvas.value) return

  const leftPageNum = currentPage.value
  const rightPageNum = currentPage.value + 1

  const leftContext = leftCanvas.value.getContext('2d')
  const rightContext = rightCanvas.value.getContext('2d')
  if (!leftContext || !rightContext) return

  const renderTasks = []

  const actualLeftPageNum = isRightToLeft.value ? rightPageNum : leftPageNum
  const actualRightPageNum = isRightToLeft.value ? leftPageNum : rightPageNum

  const leftPageTask = pdfDocument.value.getPage(actualLeftPageNum).then(async (leftPage) => {
    const leftViewport = leftPage.getViewport({ scale: scale.value })
    if (leftCanvas.value) {
      leftCanvas.value.height = leftViewport.height
      leftCanvas.value.width = leftViewport.width
    }
    return leftPage.render({
      canvasContext: leftContext,
      viewport: leftViewport,
    }).promise
  })
  renderTasks.push(leftPageTask)

  if (actualRightPageNum <= totalPages.value) {
    const rightPageTask = pdfDocument.value.getPage(actualRightPageNum).then(async (rightPage) => {
      const rightViewport = rightPage.getViewport({ scale: scale.value })
      if (rightCanvas.value) {
        rightCanvas.value.height = rightViewport.height
        rightCanvas.value.width = rightViewport.width
      }
      return rightPage.render({
        canvasContext: rightContext,
        viewport: rightViewport,
      }).promise
    })
    renderTasks.push(rightPageTask)
  }
  else {
    rightContext.clearRect(0, 0, rightCanvas.value.width, rightCanvas.value.height)
    rightCanvas.value.width = leftCanvas.value.width
    rightCanvas.value.height = leftCanvas.value.height
  }

  await Promise.all(renderTasks)
}

function nextPage() {
  const step = isDualPageMode.value ? 2 : 1
  currentPage.value = Math.min(currentPage.value + step, totalPages.value)
}

function previousPage() {
  const step = isDualPageMode.value ? 2 : 1
  currentPage.value = Math.max(currentPage.value - step, 1)
}

function togglePageMode(value?: 'single' | 'dual') {
  if (value === undefined) {
    isDualPageMode.value = !isDualPageMode.value
  }
  else {
    isDualPageMode.value = value === 'dual'
  }
  if (isDualPageMode.value && currentPage.value % 2 === 0 && currentPage.value > 1) {
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
</script>
