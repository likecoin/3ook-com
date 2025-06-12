<template>
  <UModal
    :full-screen="props.isFullScreen"
    :dismissible="props.dismissible"
  >
    <template #content>
      <div class="flex items-stretch w-full h-full max-w-[840px] max-h-[630px]'" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])

const props = defineProps({
  isFullScreen: {
    type: Boolean,
    default: false,
  },
  dismissible: {
    type: Boolean,
    default: true,
  },
})
</script>
