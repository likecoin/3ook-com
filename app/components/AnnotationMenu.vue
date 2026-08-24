<template>
  <div
    v-if="isVisible"
    ref="menuEl"
    :class="[
      'fixed',
      'z-50',
      'flex',
      'items-center',
      'w-max',
      'max-w-[calc(100vw-2rem)]',
      'bg-theme-white',
      'dark:bg-theme-black',
      'border',
      'divide-x',
      'divide-accented',
      'rounded-lg',
      'shadow-lg',
    ]"
    :style="menuStyle"
  >
    <div
      ref="scrollerEl"
      class="min-w-0 py-1 px-2 overflow-x-auto hide-scrollbar scroll-smooth"
    >
      <div
        ref="actionsEl"
        class="flex items-center gap-1 w-max"
      >
        <button
          v-for="color in ANNOTATION_COLORS"
          :key="color"
          type="button"
          class="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1"
          :style="{ backgroundColor: ANNOTATION_INDICATOR_COLORS_MAP[color] }"
          @click="handleColorSelect(color)"
        />
        <UButton
          :label="$t('reader_annotation_copy')"
          icon="i-material-symbols-content-copy-rounded"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="handleCopy"
        />
        <UButton
          :label="$t('reader_annotation_create_note')"
          icon="i-material-symbols-edit-note-rounded"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="handleCreateNote"
        />
        <UButton
          :label="$t('reader_annotation_report_issue')"
          icon="i-material-symbols-flag-rounded"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="handleReportIssue"
        />
      </div>
    </div>

    <UButton
      v-if="hasHiddenActions"
      :icon="isScrolledToEnd ? 'i-material-symbols-chevron-left-rounded' : 'i-material-symbols-chevron-right-rounded'"
      :aria-label="$t(isScrolledToEnd ? 'reader_annotation_previous_actions' : 'reader_annotation_next_actions')"
      color="neutral"
      variant="ghost"
      size="sm"
      class="shrink-0 rounded-lg"
      :ui="{ leadingIcon: 'size-6' }"
      @click="handlePageActions"
    />
  </div>
</template>

<script setup lang="ts">
import { ANNOTATION_COLORS, ANNOTATION_INDICATOR_COLORS_MAP } from '~~/shared/constants/annotations'

const { isIOS } = useAppDetection()

// Keep in step with the `max-w-[calc(100vw-2rem)]` cap on the menu and the
// `px-2` on the scroller, which match the MENU_PADDING * 2 gutter the clamp
// below leaves on each side.
const MENU_PADDING = 8

const props = defineProps<{
  isVisible: boolean
  position: { x: number, y: number, yBottom: number }
}>()

const emit = defineEmits<{
  (e: 'select', color: AnnotationColor): void
  (e: 'copy' | 'create-note' | 'report-issue'): void
}>()

const { t: $t } = useI18n()

const menuEl = useTemplateRef<HTMLDivElement>('menuEl')
const scrollerEl = useTemplateRef<HTMLDivElement>('scrollerEl')
const actionsEl = useTemplateRef<HTMLDivElement>('actionsEl')
const { width: menuWidth } = useElementSize(menuEl)
const { width: scrollerWidth } = useElementSize(scrollerEl)
const { width: actionsWidth } = useElementSize(actionsEl)
const { x: scrolledX } = useScroll(scrollerEl)
const { width: viewportWidth, height: viewportHeight } = useWindowSize()

// The actions row is `w-max`, so it keeps its full width while the scroller
// shrinks to fit the viewport — the gap between them is what is cut off.
const hasHiddenActions = computed(() => actionsWidth.value > scrollerWidth.value + 1)
const isScrolledToEnd = computed(() => scrolledX.value + scrollerWidth.value >= actionsWidth.value - 1)

// The menu is re-created on each selection, so start the actions back at page
// one — `post` so the scroller exists by the time we rewind it.
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) scrolledX.value = 0
}, { flush: 'post' })

const isInBottomHalfViewport = computed(() => props.position.y > viewportHeight.value / 2)
const shouldAppearFromBottom = computed(() => !isIOS.value || isInBottomHalfViewport.value)

const menuStyle = computed(() => {
  const minX = menuWidth.value / 2 + MENU_PADDING * 2
  const maxX = viewportWidth.value - menuWidth.value / 2 - MENU_PADDING * 2
  const clampedX = menuWidth.value > 0 && viewportWidth.value > 0
    ? minX > maxX ? viewportWidth.value / 2 : Math.min(Math.max(props.position.x, minX), maxX)
    : props.position.x
  return {
    left: `${clampedX}px`,
    top: `${shouldAppearFromBottom.value ? props.position.yBottom + MENU_PADDING : props.position.y - MENU_PADDING}px`,
    transform: shouldAppearFromBottom.value ? 'translateX(-50%)' : 'translate(-50%, -100%)',
  }
})

function handlePageActions() {
  scrolledX.value = isScrolledToEnd.value ? 0 : scrolledX.value + scrollerWidth.value
}

function handleColorSelect(color: AnnotationColor) {
  emit('select', color)
}

function handleCopy() {
  emit('copy')
}

function handleCreateNote() {
  emit('create-note')
}

function handleReportIssue() {
  emit('report-issue')
}
</script>
