<template>
  <div class="flex flex-col h-full">
    <div
      v-if="annotations.length === 0"
      class="flex-1 flex items-center justify-center text-muted py-8"
      v-text="$t('reader_annotations_empty')"
    />

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <button
        v-for="annotation in sortedAnnotations"
        :key="annotation.id"
        class="w-full text-left px-4 py-3 border-b cursor-pointer hover:bg-muted transition-colors"
        @click="handleAnnotationClick(annotation)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
            :style="{ backgroundColor: getColorRgba(annotation.color) }"
          />
          <div class="flex-1 min-w-0">
            <p
              v-if="annotation.chapterTitle"
              class="text-xs text-muted mb-1"
              v-text="annotation.chapterTitle"
            />
            <p
              class="text-sm line-clamp-2"
              v-text="annotation.text"
            />
            <p
              v-if="annotation.note"
              class="text-xs text-muted mt-1 line-clamp-1 italic"
              v-text="annotation.note"
            />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ANNOTATION_INDICATOR_COLORS_MAP } from '~/constants/annotations'

const props = defineProps<{
  annotations: Annotation[]
}>()

const emit = defineEmits<{
  (e: 'navigate', annotation: Annotation): void
}>()

const { t: $t } = useI18n()

const sortedAnnotations = computed(() => {
  return [...props.annotations].sort((a, b) => a.createdAt - b.createdAt)
})

function getColorRgba(color: AnnotationColor): string {
  return ANNOTATION_INDICATOR_COLORS_MAP[color] || ANNOTATION_INDICATOR_COLORS_MAP.yellow
}

function handleAnnotationClick(annotation: Annotation) {
  emit('navigate', annotation)
}
</script>
