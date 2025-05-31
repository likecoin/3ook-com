<template>
  <NuxtPage class="flex flex-col justify-center items-center grow w-full" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'reader',
  layoutTransition: {
    name: 'reader',
    mode: 'in-out',
  },
})
</script>
