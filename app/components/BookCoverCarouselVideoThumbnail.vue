<template>
  <div class="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
    <img
      :src="props.src"
      :alt="props.alt"
      class="w-full h-full object-cover"
    >
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="w-16 h-16 bg-theme-black dark:bg-theme-cyan rounded-full flex items-center justify-center">
        <UIcon
          name="i-material-symbols-play-arrow-rounded"
          class="w-8 h-8 text-white"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
})
</script>
