<template>
  <main class="flex flex-col items-center justify-center gap-4 py-16">
    <UProgress
      v-if="!error"
      animation="carousel"
    >
      <template #indicator>
        <span v-text="$t('settings_connect_refresh_indicator')" />
      </template>
    </UProgress>

    <UAlert
      v-else
      icon="i-material-symbols-error-outline-rounded"
      color="error"
      variant="soft"
      :title="$t('settings_connect_refresh_failed')"
    />

    <UButton
      v-if="error"
      :label="$t('settings_connect_refresh_back_button')"
      :to="localeRoute({ name: 'account' })"
    />
  </main>
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn } = useUserSession()
const likeCoinSessionAPI = useLikeCoinSessionAPI()

const error = ref(false)

useHead({
  title: $t('settings_connect_refresh_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

onMounted(async () => {
  if (!hasLoggedIn.value) {
    await navigateTo(localeRoute({ name: 'account' }), { replace: true })
    return
  }
  try {
    const { url } = await likeCoinSessionAPI.createStripeConnectAccount()
    await navigateTo(url, { external: true })
  }
  catch (e) {
    console.error('Failed to refresh Stripe Connect onboarding link:', e)
    error.value = true
  }
})
</script>
