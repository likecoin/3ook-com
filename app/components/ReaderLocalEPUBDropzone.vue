<template>
  <div class="flex flex-col justify-center items-center p-6 bg-default">
    <button
      type="button"
      :class="[
        'flex flex-col items-center justify-center gap-2',
        'w-full max-w-md p-10',
        'border border-dashed rounded-lg transition-colors *:pointer-events-none',
        isDraggingOver ? 'border-inverted' : 'border-accented hover:border-inverted',
      ]"
      @click="emit('browse')"
      @dragenter.prevent="isDraggingOver = true"
      @dragover.prevent
      @dragleave.prevent="isDraggingOver = false"
      @drop.prevent="handleDrop"
    >
      <UIcon
        name="i-material-symbols-upload-file-outline-rounded"
        size="48"
        class="text-muted"
      />
      <span
        class="text-base font-semibold"
        v-text="$t('reader_standalone_picker_title')"
      />
      <span
        class="text-sm text-muted"
        v-text="$t('reader_standalone_picker_description')"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'browse'): void
  (e: 'select', file: File): void
}>()

const isDraggingOver = ref(false)

function handleDrop(event: DragEvent) {
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('select', file)
}
</script>
