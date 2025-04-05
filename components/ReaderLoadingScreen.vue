<template>
  <div class="flex flex-col justify-center items-center py-[56px]">
    <AppLogo
      class="text-green-500 shrink-0"
      :height="24"
    />

    <img
      :class="[
        'h-[30vh] mt-[8vh] shrink',
        'bg-white',
        'border',
        'border-[#EBEBEB]',
        'rounded-lg',
        'group-hover:shadow-xl',
        'group-hover:scale-105',
        'transition-all',
        'duration-200',
        'ease-in-out',
        'origin-bottom',
        'cursor-pointer',
        { 'opacity-0': !props.bookCoverSrc },
      ]"
      :src="props.bookCoverSrc"
      :alt="props.bookName"
    >

    <div
      class="mt-2 text-sm laptop:text-base text-[#1A1A1A] font-semibold"
      v-text="props.bookName"
    />

    <UIcon
      class="animate-spin mt-[8vh] text-green-500 shrink-0"
      name="material-symbols-progress-activity"
      size="48"
    />

    <span
      class="mt-2 h-4"
      v-text="loadingLabel"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  bookCoverSrc: {
    type: String,
    default: '',
  },
  bookName: {
    type: String,
    default: '',
  },
  loadingLabel: {
    type: String,
    default: 'Loading...',
  },
})
</script>
