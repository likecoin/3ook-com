<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col justify-center items-center grow w-full max-w-[1440px] mx-auto px-12 opacity-20">
      <UIcon
        name="i-material-symbols-construction-rounded"
        size="128"
      />
      <span
        class="font-bold"
        v-text="$t('work_in_progress')"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
</script>
