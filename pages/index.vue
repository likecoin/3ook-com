<template>
  <main class="justify-center items-center w-full max-w-[1440px] mx-auto px-12 opacity-20">
    <UIcon
      class="animate-spin"
      name="material-symbols-progress-activity"
      size="128"
    />
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
const localeRoute = useLocaleRoute()

await navigateTo(
  localeRoute({
    name: 'store',
    query: route.query,
  }),
  { replace: true },
)
</script>
