<template>
  <div class="relative flex flex-col w-full h-full">
    <div class="flex justify-between items-center p-4 bg-gray-100 border-b">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-material-symbols-chevron-left"
          :disabled="isAtFirstPage"
          variant="ghost"
          @click="previousPage"
        />
        <span class="text-sm">{{ pageDisplayText }}</span>
        <UButton
          icon="i-material-symbols-chevron-right"
          :disabled="isAtLastPage"
          variant="ghost"
          @click="nextPage"
        />
      </div>

      <div class="flex items-center gap-2">
        <UButton
          v-if="!isMobile"
          :icon="isDualPageMode ? 'i-material-symbols-splitscreen' : 'i-material-symbols-fullscreen'"
          variant="ghost"
          @click="togglePageMode"
        />
        <UButton
          v-if="isDualPageMode"
          icon="i-material-symbols-swap-horiz"
          variant="ghost"
          @click="swapCanvasOrder"
        />
        <UButton
          icon="i-material-symbols-zoom-out"
          :disabled="scale <= 0.5"
          variant="ghost"
          @click="zoomOut"
        />
        <span class="text-sm">{{ Math.round(scale * 100) }}%</span>
        <UButton
          icon="i-material-symbols-zoom-in"
          :disabled="scale >= 3"
          variant="ghost"
          @click="zoomIn"
        />
      </div>
    </div>

    <div
      ref="container"
      class="flex-1 overflow-auto bg-gray-50 flex justify-center items-start p-4"
    >
      <div
        v-if="isDualPageMode"
        class="flex gap-4"
        :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }"
      >
        <canvas
          ref="leftCanvas"
          class="border shadow-lg bg-white"
        />
        <canvas
          ref="rightCanvas"
          class="border shadow-lg bg-white"
        />
      </div>
      <canvas
        v-else
        ref="singleCanvas"
        class="border shadow-lg bg-white"
        :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist'

interface Props {
  pdfBuffer: ArrayBuffer
}

const props = defineProps<Props>()

const singleCanvas = useTemplateRef<HTMLCanvasElement>('singleCanvas')
const leftCanvas = useTemplateRef<HTMLCanvasElement>('leftCanvas')
const rightCanvas = useTemplateRef<HTMLCanvasElement>('rightCanvas')
const container = useTemplateRef<HTMLDivElement>('container')

const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const pdfDocument = shallowRef<pdfjsLib.PDFDocumentProxy>()
const isDualPageMode = ref(false)
const isCanvasOrderSwapped = ref(false)

const emit = defineEmits<{
  error: [error: Error]
}>()

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)
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
  return currentPage.value >= totalPages.value
})

onMounted(async () => {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    isDualPageMode.value = !isMobile.value
    await loadPDF()
  }
  catch (error) {
    emit('error', error as Error)
  }
})

watch(() => isMobile.value, async (newValue) => {
  isDualPageMode.value = !newValue
})

watch(() => props.pdfBuffer, async () => {
  if (props.pdfBuffer) {
    await loadPDF()
  }
})

watch([currentPage, scale, isDualPageMode], async () => {
  if (pdfDocument.value) {
    await nextTick()
    await renderPages()
  }
})

async function loadPDF() {
  if (!props.pdfBuffer) return

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: props.pdfBuffer,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    })

    pdfDocument.value = await loadingTask.promise
    totalPages.value = pdfDocument.value.numPages
    currentPage.value = 1

    await renderPages()
  }
  catch (error) {
    emit('error', error as Error)
  }
}

async function renderPages() {
  if (!pdfDocument.value) return

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

  const actualLeftPageNum = isCanvasOrderSwapped.value ? rightPageNum : leftPageNum
  const actualRightPageNum = isCanvasOrderSwapped.value ? leftPageNum : rightPageNum

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

function togglePageMode() {
  isDualPageMode.value = !isDualPageMode.value
  if (isDualPageMode.value && currentPage.value % 2 === 0 && currentPage.value > 1) {
    currentPage.value--
  }
  renderPages()
}

function zoomIn() {
  if (scale.value < 3) {
    scale.value += 0.25
  }
}

function zoomOut() {
  if (scale.value > 0.5) {
    scale.value -= 0.25
  }
}

function swapCanvasOrder() {
  isCanvasOrderSwapped.value = !isCanvasOrderSwapped.value
  renderPages()
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
