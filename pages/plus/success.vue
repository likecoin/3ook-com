<template>
  <div class="flex flex-col grow">
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
const likeCoinSessionAPI = useLikeCoinSessionAPI()

const route = useRoute()
const getRouteQuery = useRouteQuery()
const getRouteBaseName = useRouteBaseName()

const isRedirected = computed(() => !!getRouteQuery('redirect'))
const isYearly = computed(() => getRouteQuery('period') === 'yearly')

const isRefreshing = ref(true)
const isRedirecting = ref(false)
const isLikerPlus = computed(() => user.value?.isLikerPlus)

useHead({
  title: $t('subscription_success_page_title'),
})

async function fetchPlusGiftStatus() {
  try {
    const {
      giftClassId: giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    } = await likeCoinSessionAPI.fetchLikerPlusGiftStatus()
    return {
      giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('subscription_success_fetch_gift_error'),
      description: $t('subscription_success_fetch_gift_error_description'),
    })
    return {}
  }
}

onMounted(async () => {
  try {
    isRefreshing.value = true
    await accountStore.refreshSessionInfo()
    let retry = 0
    while (!isLikerPlus.value && retry < 4) {
      await sleep(5000)
      await accountStore.refreshSessionInfo()
      retry++
    }
    const {
      giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    } = await fetchPlusGiftStatus()
    if (isRedirected.value) {
      const isTrial = getRouteQuery('trial') !== '0'
      const price = isTrial
        ? 0
        : isYearly.value ? yearlyPrice.value : monthlyPrice.value
      useLogEvent('purchase', {
        currency: currency.value,
        value: price,
        items: [{
          id: `plus-beta-${isYearly.value ? 'yearly' : 'monthly'}`,
          name: `Plus Beta (${isYearly.value ? 'yearly' : 'monthly'}`,
          price,
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

    if (giftNFTClassId && giftCartId && giftPaymentId && giftClaimToken) {
      accountStore.clearPlusRedirectRoute()
      await navigateTo(localeRoute({
        name: 'claim-page',
        query: {
          payment_id: giftPaymentId,
          claiming_token: giftClaimToken,
          cart_id: giftCartId,
          nft_class_id: giftNFTClassId,
        },
      }), { replace: true })
    }
    else {
      const redirectRoute = accountStore.getPlusRedirectRoute()

      if (redirectRoute && redirectRoute.name) {
        accountStore.clearPlusRedirectRoute()
        await navigateTo(localeRoute(redirectRoute), { replace: true })
      }
      else {
        isRefreshing.value = false
        setTimeout(redirectToShelf, 1000)
      }
    }
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
