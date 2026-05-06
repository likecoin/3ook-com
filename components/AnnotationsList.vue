<template>
  <div>
    <p
      v-if="items.length === 0"
      class="text-muted py-8 text-center"
      v-text="$t('reader_annotations_empty')"
    />
    <div v-else>
      <button
        v-for="item in sortedItems"
        :key="item.id"
        class="w-full text-left px-4 py-3 border-b border-muted cursor-pointer hover:bg-muted transition-colors"
        @click="handleItemClick(item)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
            :style="{ backgroundColor: getColorRgba(item.color) }"
          />
          <div class="flex-1 min-w-0">
            <p
              v-if="item.chapterTitle"
              class="text-xs text-muted mb-1"
              v-text="item.chapterTitle"
            />
            <p
              class="text-sm line-clamp-2"
              v-text="item.text"
            />
            <p
              v-if="item.note"
              class="text-xs text-muted mt-1 line-clamp-1 italic"
              v-text="item.note"
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
  items: Annotation[]
}>()

const emit = defineEmits<{
  (e: 'navigate', item: Annotation): void
}>()

const { t: $t } = useI18n()

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => a.createdAt - b.createdAt)
})

function getColorRgba(color: AnnotationColor | undefined): string {
  return (color && ANNOTATION_INDICATOR_COLORS_MAP[color]) || ANNOTATION_INDICATOR_COLORS_MAP.yellow
}

function handleItemClick(item: Annotation) {
  emit('navigate', item)
}
</script>
