<template>
  <header
    :class="[
      'flex',
      'items-center',
      'justify-between',
      'gap-4',

      'min-h-[56px]',
      'px-3', 'phone:px-5',

      'bg-white',
      'border-b',
      'border-[#C7C7C7]',
    ]"
  >
    <div class="flex items-center gap-4 min-w-0">
      <UButton
        class="-mx-2 shrink-0"
        color="neutral"
        variant="ghost"
        size="xl"
        icon="i-material-symbols-arrow-back-rounded"
        :to="localeRoute({ name: 'shelf' })"
      />

      <div class="flex flex-col overflow-hidden min-w-0">
        <div
          :class="['font-semibold truncate', { 'text-xs': !!props.chapterTitle }]"
          v-text="props.bookName"
        />
        <div
          v-if="props.chapterTitle"
          class="text-sm font-semibold truncate"
          v-text="props.chapterTitle"
        />
      </div>
    </div>

    <slot name="center" />

    <div class="shrink-0 flex items-center">
      <slot name="trailing" />
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps({
  bookName: {
    type: String,
    default: '',
  },
  chapterTitle: {
    type: String,
    default: '',
  },
})

const localeRoute = useLocaleRoute()
</script>
