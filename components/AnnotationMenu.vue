<template>
  <div
    v-if="isVisible"
    ref="menuEl"
    class="fixed z-50 flex items-center gap-2 bg-theme-white dark:bg-theme-black border rounded-lg shadow-lg"
    :style="menuStyle"
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
      :label="$t('reader_annotation_create_note')"
      icon="i-material-symbols-edit-note-rounded"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="handleCreateNote"
    />
  </div>
</template>

<script setup lang="ts">
import { ANNOTATION_COLORS, ANNOTATION_INDICATOR_COLORS_MAP } from '~/constants/annotations'

const { isIOS } = useAppDetection()

const MENU_PADDING = 8

const props = defineProps<{
  isVisible: boolean
  position: { x: number, y: number, yBottom: number }
}>()

const emit = defineEmits<{
  (e: 'select', color: AnnotationColor): void
  (e: 'create-note'): void
}>()

const { t: $t } = useI18n()

const menuEl = useTemplateRef<HTMLDivElement>('menuEl')
const { width: menuWidth } = useElementSize(menuEl)
const { width: viewportWidth, height: viewportHeight } = useWindowSize()

const isInBottomHalfViewport = computed(() => props.position.y > viewportHeight.value / 2)
const shouldAppearFromBottom = computed(() => !isIOS.value || isInBottomHalfViewport.value)

const menuStyle = computed(() => {
  const minX = menuWidth.value / 2 + MENU_PADDING * 2
  const maxX = viewportWidth.value - menuWidth.value / 2 - MENU_PADDING * 2
  const clampedX = menuWidth.value > 0 && viewportWidth.value > 0
    ? minX > maxX ? viewportWidth.value / 2 : Math.min(Math.max(props.position.x, minX), maxX)
    : props.position.x
  return {
    padding: `${MENU_PADDING}px`,
    left: `${clampedX}px`,
    top: `${shouldAppearFromBottom.value ? props.position.yBottom + MENU_PADDING : props.position.y - MENU_PADDING}px`,
    transform: shouldAppearFromBottom.value ? 'translateX(-50%)' : 'translate(-50%, -100%)',
  }
})

function handleColorSelect(color: AnnotationColor) {
  emit('select', color)
}

function handleCreateNote() {
  emit('create-note')
}
</script>
