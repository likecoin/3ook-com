<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />

    <main class="flex flex-col items-center w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
      <div class="flex flex-col items-center text-center">
        <UIcon
          name="i-material-symbols-check-circle"
          class="text-green-500 mb-4"
          size="6xl"
        />
        <h1 class="text-2xl font-bold mb-2">
          {{ $t('subscription_success_title') }}
        </h1>
        <p class="text-gray-600 mb-6">
          {{ $t('subscription_success_description') }}
        </p>

        <UButton
          v-if="!isRefreshing"
          color="primary"
          :label="$t('subscription_success_continue_button')"
          :loading="isRedirecting"
          @click="redirectToShelf"
        />
        <UButton
          v-else
          color="primary"
          :loading="true"
          :label="$t('subscription_success_loading')"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const isRefreshing = ref(true)
const isRedirecting = ref(false)
const { handleError } = useErrorHandler()

useHead({
  title: $t('subscription_success_page_title'),
})

onMounted(async () => {
  try {
    await $fetch('/api/account/refresh', { method: 'POST' })
    isRefreshing.value = false

    setTimeout(() => {
      redirectToShelf()
    }, 1000)
  }
  catch (error) {
    handleError(error, {
      title: $t('subscription_success_refresh_error'),
      description: $t('subscription_success_refresh_error_description'),
    })
    isRefreshing.value = false
  }
})

async function redirectToShelf() {
  isRedirecting.value = true

  try {
    await navigateTo(localeRoute({ name: 'shelf' }))
  }
  catch (error) {
    handleError(error)
    isRedirecting.value = false
  }
}
</script>
