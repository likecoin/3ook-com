<template>
  <UModal
    :close="{
      color: 'neutral',
      variant: 'outline',
      class: 'rounded-full',
      onClick: () => emit('close'),
    }"
    :ui="{ title: 'flex items-center gap-2' }"
  >
    <template #title>
      <UIcon
        class="text-red-500"
        name="material-symbols-error"
        size="24"
      />

      <h2
        class="text-(--ui-text-highlighted) font-semibold"
        v-text="title"
      />
    </template>
    <template #body>
      <p
        v-if="props.description"
        class="text-(--ui-text-muted) text-sm"
        v-text="description"
      />

      <code
        v-if="props.rawMessage"
        class="block not-first:mt-4 px-2 py-1 text-xs font-mono font-medium rounded-md border border-gray-300 bg-gray-100 break-all"
        v-text="rawMessage"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])

const props = defineProps({
  title: String,
  description: String,
  rawMessage: String,
})
</script>
