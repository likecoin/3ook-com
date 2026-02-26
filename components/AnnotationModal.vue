<template>
  <UModal
    v-model:open="open"
    class="max-w-[400px]"
    :ui="{
      body: [
        'flex',
        'flex-col',
        'items-start',
        'justify-center',
        'w-full',
        'py-6',
        'px-4',
        'gap-4',
        'rounded-xl',
      ],
      footer: [
        'flex',
        'gap-2',
        'w-full',
        'justify-between',
      ],
    }"
    :title="isNewAnnotation ? $t('reader_annotation_add_note') : $t('reader_annotation_edit_note')"
  >
    <template #body>
      <div
        class="w-full p-3 rounded-lg text-sm line-clamp-3"
        :style="{ backgroundColor: selectedColorRgba }"
        v-text="text"
      />

      <div class="flex gap-2 w-full justify-center">
        <button
          v-for="color in ANNOTATION_COLORS"
          :key="color"
          type="button"
          :class="[
            'w-8 h-8 rounded-full border-2 transition-transform focus:outline-none focus:ring-1 focus:ring-offset-1',
            selectedColor === color ? 'border-primary' : 'border-transparent',
            'hover:scale-110 cursor-pointer',
          ]"
          :style="{ backgroundColor: ANNOTATION_INDICATOR_COLORS_MAP[color] }"
          @click="selectedColor = color"
        />
      </div>

      <UFormField
        class="w-full"
        :help="`${note.length}/${ANNOTATION_NOTE_MAX_LENGTH}`"
        :ui="{ help: 'text-right' }"
      >
        <UTextarea
          v-model="note"
          class="w-full"
          :maxlength="ANNOTATION_NOTE_MAX_LENGTH"
          :placeholder="$t('reader_annotation_note_placeholder')"
          variant="soft"
          :rows="4"
        />
      </UFormField>
    </template>

    <template #footer>
      <UButton
        v-if="annotation"
        color="error"
        variant="soft"
        :label="$t('reader_annotation_delete')"
        @click="handleDelete"
      />
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('reader_annotation_cancel')"
          @click="handleCancel"
        />
        <UButton
          color="primary"
          :label="$t('reader_annotation_save')"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  ANNOTATION_COLORS,
  ANNOTATION_COLORS_MAP,
  ANNOTATION_INDICATOR_COLORS_MAP,
  ANNOTATION_NOTE_MAX_LENGTH,
} from '~/constants/annotations'

const props = defineProps<{
  annotation?: Annotation | null
  text: string
  initialColor: AnnotationColor
  isNewAnnotation?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', data: { color: AnnotationColor, note: string }): void
  (e: 'delete'): void
}>()

const { t: $t } = useI18n()
const open = defineModel<boolean>('open')

const selectedColor = ref<AnnotationColor>(props.initialColor)
const note = ref(props.annotation?.note || '')

const selectedColorRgba = computed(() => {
  return ANNOTATION_COLORS_MAP[selectedColor.value]
})

watch(() => props.annotation, (newAnnotation) => {
  if (newAnnotation) {
    selectedColor.value = newAnnotation.color
    note.value = newAnnotation.note || ''
  }
  else {
    selectedColor.value = props.initialColor
    note.value = ''
  }
}, { immediate: true })

watch(() => props.initialColor, (newColor) => {
  if (!props.annotation) {
    selectedColor.value = newColor
  }
})

function handleCancel() {
  open.value = false
}

function handleSave() {
  emit('save', {
    color: selectedColor.value,
    note: note.value,
  })
}

function handleDelete() {
  emit('delete')
}
</script>
