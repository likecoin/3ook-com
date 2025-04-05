<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col justify-center items-center grow w-full max-w-[1440px] mx-auto px-12 opacity-20">
      <UIcon
        class="animate-spin"
        name="material-symbols-progress-activity"
        size="128"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
const { loggedIn: hasLoggedIn } = useUserSession()

const localeRoute = useLocaleRoute()

await navigateTo(localeRoute({ name: hasLoggedIn.value ? 'bookshelf' : 'account' }))
</script>
