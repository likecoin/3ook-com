<template>
  <main class="flex flex-col items-center justify-center h-svh px-4">
    <AppLogo
      class="mb-16"
      :height="64"
    />

    <p
      v-if="props.error?.statusCode"
      class="mb-4 text-8xl font-semibold font-mono text-center"
      v-text="props.error.statusCode"
    />

    <p
      class="text-2xl text-center"
      v-text="props.error?.message"
    />

    <code
      v-if="props.error?.data?.rawMessage"
      class="block not-first:mt-4 px-2 py-1 text-xs font-mono font-medium rounded-md border border-gray-300 bg-gray-100 break-all whitespace-pre-wrap"
      v-text="props.error?.data?.rawMessage"
    />

    <UButton
      class="mt-8"
      :label="backButtonLabel"
      :to="backButtonRoute"
      size="xl"
    />
  </main>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const route = useRoute()
const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const { t: $t } = useI18n()
const props = defineProps({
  error: Object as () => NuxtError<{ rawMessage?: string }>,
})

const routeBaseName = computed(() => getRouteBaseName(route))

const backButtonLabel = computed(() => {
  if (routeBaseName.value?.startsWith('store')) {
    return $t('error_back_to_bookstore_button_label')
  }
  if (routeBaseName.value?.startsWith('shelf')) {
    return $t('error_back_to_bookshelf_button_label')
  }
  return $t('error_back_to_home_button_label')
})

const backButtonRoute = computed(() => {
  if (routeBaseName.value?.startsWith('store')) {
    return localeRoute({ name: 'store' })
  }
  if (routeBaseName.value?.startsWith('shelf')) {
    return localeRoute({ name: 'shelf' })
  }
  return localeRoute({ name: 'index' })
})
</script>
