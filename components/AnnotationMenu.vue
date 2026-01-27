<template>
  <div
    v-if="isVisible"
    class="fixed z-50 flex items-center gap-2 -mt-2 p-2 bg-theme-white dark:bg-theme-black border rounded-lg shadow-lg"
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

const props = defineProps<{
  isVisible: boolean
  position: { x: number, y: number }
}>()

const emit = defineEmits<{
  (e: 'select', color: AnnotationColor): void
  (e: 'create-note'): void
}>()

const { t: $t } = useI18n()

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  transform: 'translate(-50%, -100%)',
}))

function handleColorSelect(color: AnnotationColor) {
  emit('select', color)
}

function handleCreateNote() {
  emit('create-note')
}
</script>
