<template>
  <div class="flex p-4 laptop:p-6 bg-default">
    <button
      type="button"
      :class="[
        'flex flex-col flex-1 items-center justify-center gap-2 p-10',
        'border-2 border-dashed rounded-lg transition-colors',
        props.isActive ? 'border-primary bg-primary/10' : 'border-accented hover:border-inverted',
      ]"
      @click="emit('browse')"
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
const props = defineProps<{
  isActive?: boolean
}>()

const emit = defineEmits<{
  (e: 'browse'): void
}>()
</script>
