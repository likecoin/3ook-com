<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />
  </div>
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
navigateTo(localeRoute({ name: 'pricing' }))
</script>
