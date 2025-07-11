<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />

    <main class="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-4 space-y-4 grow text-center">
      <UIcon
        name="i-material-symbols-check-circle-rounded"
        class="text-green-500 mb-4"
        size="64"
      />

      <h1
        class="mb-2 text-2xl font-bold"
        v-text="$t('subscription_success_title')"
      />
      <p
        class="mb-6 text-gray-600"
        v-text="$t('subscription_success_description')"
      />

      <UButton
        v-if="!isRefreshing"
        :label="$t('subscription_success_continue_button')"
        color="primary"
        :loading="isRedirecting"
        @click="redirectToShelf"
      />
      <UButton
        v-else
        :label="$t('subscription_success_loading')"
        color="primary"
        :loading="true"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const { currency, yearlyPrice, monthlyPrice } = useSubscription()
const { user } = useUserSession()

const route = useRoute()
const getRouteBaseName = useRouteBaseName()

const isRedirected = computed(() => !!getRouteQuery('redirect'))
const isYearly = computed(() => getRouteQuery('period') === 'yearly')

const isRefreshing = ref(true)
const isRedirecting = ref(false)
const isLikerPlus = computed(() => user.value?.isLikerPlus)

useHead({
  title: $t('subscription_success_page_title'),
})

onMounted(async () => {
  try {
    isRefreshing.value = true
    await accountStore.refreshSessionInfo()
    if (!isLikerPlus.value) {
      await sleep(5000)
      await accountStore.refreshSessionInfo()
    }
    isRefreshing.value = false
    if (isRedirected.value) {
      useLogEvent('purchase', {
        currency: currency.value,
        value: isYearly.value ? yearlyPrice.value : monthlyPrice.value,
        items: [{
          id: `plus-beta-${isYearly.value ? 'yearly' : 'monthly'}`,
          name: `Plus Beta (${isYearly.value ? 'yearly' : 'monthly'}`,
          price: 0, // We always start with 3 days free trial, set price to 0
          // price: isYearly.value ? yearlyPrice.value : monthlyPrice.value,
          currency: currency.value,
          quantity: 1,
        }],
      })
      await navigateTo(localeRoute({
        name: getRouteBaseName(route),
        query: {
          ...route.query,
          redirect: undefined,
        },
      }), { replace: true })
    }

    setTimeout(redirectToShelf, 1000)
  }
  catch (error) {
    await handleError(error, {
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
    await handleError(error)
    isRedirecting.value = false
  }
}
</script>
