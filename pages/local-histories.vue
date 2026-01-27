<template>
  <div class="relative">
    <main
      class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16"
    >
      <div class="flex flex-col items-center m-auto">
        <UIcon
          class="opacity-20 mb-4"
          name="i-material-symbols-location-on-outline-rounded"
          size="128"
        />

        <h2 class="text-2xl font-bold text-highlighted mb-4">
          {{ $t('local_histories_page_title') }}
        </h2>

        <p class="text-muted text-center max-w-md">
          {{ $t('local_histories_page_description') }}
        </p>

        <div class="mt-8">
          <UButton
            :to="localeRoute({ name: 'store' })"
            variant="outline"
            size="lg"
          >
            {{ $t('back_to_store') }}
          </UButton>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const runtimeConfig = useRuntimeConfig()

const canonicalURL = computed(() => {
  const baseURL = (runtimeConfig as unknown).public?.baseURL || ''
  return `${baseURL}/local-histories`
})

const ogTitle = computed(() => $t('local_histories_page_title'))

useHead(() => {
  const meta = [
    {
      property: 'og:title',
      content: ogTitle.value,
    },
    {
      name: 'description',
      content: $t('local_histories_page_description'),
    },
    {
      property: 'og:description',
      content: $t('local_histories_page_description'),
    },
  ]

  const link = [
    {
      rel: 'canonical',
      href: canonicalURL.value,
    },
  ]

  return {
    title: ogTitle.value,
    meta,
    link,
  }
})
</script>
