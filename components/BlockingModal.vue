<template>
  <UModal
    :default-open="true"
    :dismissible="false"
    :ui="{ content: 'flex flex-col justify-center items-center w-auto min-w-[200px] min-h-[200px] px-6 py-4 divide-y-0 rounded-2xl' }"
  >
    <template #content>
      <img
        class="animate-pulse w-[64px]"
        src="/favicon.svg"
      >
      <div
        class="mt-2 font-bold"
        v-text="props.title"
      />
      <div
        v-if="props.description"
        class="mt-4 text-(--ui-text-muted) text-sm"
        v-text="props.description"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
}>()
</script>
