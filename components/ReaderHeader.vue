<template>
  <header class="flex justify-between min-h-[56px] px-5 bg-white border-b border-[#C7C7C7]">
    <div class="flex items-center gap-4">
      <UButton
        class="-mx-2"
        color="neutral"
        variant="ghost"
        size="xl"
        icon="i-material-symbols-arrow-back-rounded"
        :to="localeRoute({ name: 'bookshelf' })"
      />

      <div>
        <div
          :class="['font-semibold', { 'text-xs': !!props.chapterTitle }]"
          v-text="props.bookName"
        />
        <div
          v-if="props.chapterTitle"
          class="text-sm font-semibold"
          v-text="props.chapterTitle"
        />
      </div>
    </div>

    <slot name="trailing" />
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
