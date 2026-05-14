<template>
  <div class="flex min-h-screen w-full flex-col">
    <section class="local-histories-index-hero relative flex w-full items-end justify-center px-6 pb-16 pt-32 laptop:pb-24 laptop:pt-48">
      <UButton
        class="absolute z-10 top-4 left-4"
        icon="i-material-symbols-arrow-back-rounded"
        :to="localeRoute({ name: 'store' })"
        variant="ghost"
        color="neutral"
        size="md"
        :aria-label="$t('common_back')"
        :ui="{ base: 'text-white hover:bg-white/10' }"
      />
      <div class="z-10 mx-auto max-w-3xl text-center text-white">
        <h1
          class="text-4xl font-bold laptop:text-6xl"
          v-text="$t('local_histories_index_title')"
        />
        <p
          class="mt-4 text-lg text-white/90 laptop:text-xl"
          v-text="$t('local_histories_index_description')"
        />
      </div>
    </section>

    <section class="mx-auto w-full max-w-5xl px-6 py-16 laptop:py-24">
      <div class="grid gap-8 sm:grid-cols-2">
        <NuxtLink
          v-for="region in regions"
          :key="region.routeName"
          :to="localeRoute({ name: region.routeName })"
          class="group relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
        >
          <div
            class="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
            :class="region.bgClass"
          />
          <ClientOnly>
            <div
              aria-hidden="true"
              class="map-preview pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
            >
              <LazyLocalHistoriesMap
                v-if="region.routeName === 'local-histories-taiwan'"
                class="h-full w-full"
              />
              <LazyHKLocalHistoriesMap
                v-else-if="region.routeName === 'local-histories-hongkong'"
                class="h-full w-full"
              />
            </div>
          </ClientOnly>
          <div
            class="relative flex flex-col justify-end p-8 laptop:p-10"
            :class="region.minH"
          >
            <h2
              class="text-3xl font-bold text-white laptop:text-4xl"
              v-text="$t(region.titleKey)"
            />
            <p
              class="mt-2 text-sm text-white/80 laptop:text-base"
              v-text="$t(region.descKey)"
            />
            <span
              class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white/90 transition group-hover:gap-2"
            >
              <UIcon
                name="i-material-symbols-arrow-forward-rounded"
                class="text-lg"
              />
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  colorMode: 'light',
})

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()

useHead({
  title: t('local_histories_index_title'),
  meta: [
    { name: 'description', content: t('local_histories_index_description') },
    { property: 'og:title', content: t('local_histories_index_title') },
    { property: 'og:description', content: t('local_histories_index_description') },
  ],
  link: [
    { rel: 'canonical', href: `${runtimeConfig.public.baseURL}${route.path}` },
  ],
})

const localeRoute = useLocaleRoute()

const regions = [
  {
    routeName: 'local-histories-taiwan',
    titleKey: 'local_histories_index_tw_title',
    descKey: 'local_histories_index_tw_description',
    bgClass: 'bg-tw-card',
    minH: 'min-h-[280px] laptop:min-h-[360px]',
  },
  {
    routeName: 'local-histories-hongkong',
    titleKey: 'local_histories_index_hk_title',
    descKey: 'local_histories_index_hk_description',
    bgClass: 'bg-hk-card',
    minH: 'min-h-[280px] laptop:min-h-[360px]',
  },
]
</script>

<style scoped>
.local-histories-index-hero {
  background: linear-gradient(135deg, #2d4a3e 0%, #3a6b5a 30%, #4a7a6a 60%, #2d4a3e 100%);
}

.bg-tw-card {
  background: linear-gradient(160deg, #3a6b5a 0%, #5a9a7a 40%, #7ab89a 100%);
}

.bg-hk-card {
  background: linear-gradient(160deg, #8a4a2a 0%, #b85c38 40%, #d4a574 100%);
}

.map-preview {
  opacity: 0.3;
}

.map-preview :deep(path) {
  fill: white !important;
  stroke: rgba(255, 255, 255, 0.5) !important;
  cursor: default !important;
  will-change: auto !important;
}

.map-preview :deep(circle) {
  fill: white !important;
  stroke: white !important;
}

.map-preview :deep(#features),
.map-preview :deep(#pins) {
  will-change: auto !important;
  transition: none !important;
}
</style>
