<template>
  <main class="items-center justify-center w-full max-w-xl mx-auto p-4 space-y-4 text-center">
    <UIcon
      name="i-material-symbols-check-circle-rounded"
      class="text-theme-cyan mb-4"
      size="64"
    />

    <h1
      class="mb-2 text-2xl font-bold"
      v-text="$t('subscription_success_title')"
    />
    <p
      class="mb-6 text-muted"
      v-text="$t('subscription_success_description')"
    />

    <UButton
      v-if="!isRefreshing"
      :label="$t('subscription_success_continue_button')"
      color="primary"
      :loading="isRedirecting"
      @click="redirectToLibrary"
    />
    <UButton
      v-else
      :label="$t('subscription_success_loading')"
      color="primary"
      :loading="true"
    />
  </main>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const { currency, yearlyPrice, monthlyPrice } = useSubscription()
const { initializePaymentCurrency } = usePaymentCurrency()
const { convertPrice } = useCurrency()
const { user } = useUserSession()
const plusGiftSessionAPI = usePlusGiftSessionAPI()

const route = useRoute()
const getRouteQuery = useRouteQuery()
const getRouteBaseName = useRouteBaseName()

const isRedirected = computed(() => !!getRouteQuery('redirect'))
const targetPeriod = computed(() => getRouteQuery('period'))
const isYearly = computed(() => targetPeriod.value === 'yearly')
const paymentId = computed(() => getRouteQuery('payment_id') || getRouteQuery('session_id'))
const coupon = computed(() => getRouteQuery('coupon'))

const isRefreshing = ref(true)
const isRedirecting = ref(false)
const isLikerPlus = computed(() => user.value?.isLikerPlus)
const affiliateFrom = computed(() => user.value?.plusAffiliateFrom)
// The route `period` query is in SubscriptionPlan form ('yearly'/'monthly')
// while the session stores LikerPlusStatus ('year'/'month'). Map between them,
// otherwise the comparison below never matches and the onMounted retry loop
// burns its full timeout on the loading state for already-subscribed users.
const PLAN_TO_STATUS: Record<SubscriptionPlan, LikerPlusStatus> = {
  yearly: 'year',
  monthly: 'month',
}
const isPeriodMatch = computed(() => {
  if (!targetPeriod.value) return true
  return user.value?.likerPlusPeriod === PLAN_TO_STATUS[targetPeriod.value as SubscriptionPlan]
})

useHead({
  title: $t('subscription_success_page_title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

async function fetchPlusGiftStatus({ shouldHandleError = true } = {}) {
  try {
    const {
      giftClassId: giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    } = await plusGiftSessionAPI.fetchLikerPlusGiftStatus()
    return {
      giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    }
  }
  catch (error) {
    if (shouldHandleError) {
      await handleError(error, {
        title: $t('subscription_success_fetch_gift_error'),
        description: $t('subscription_success_fetch_gift_error_description'),
      })
    }
    return {}
  }
}

onMounted(async () => {
  try {
    isRefreshing.value = true
    await accountStore.refreshSessionInfo()
    let retry = 0
    while (!(isLikerPlus.value && isPeriodMatch.value) && retry < 4) {
      await sleep(5000)
      await accountStore.refreshSessionInfo()
      retry++
    }
    // The gift book attaches asynchronously — Stripe writes it to the subscription
    // during invoice processing, RevenueCat creates the cart in its grant webhook —
    // so `/plus/gift` (now provider-aware) can lag the entitlement. The IAP checkout
    // sets `gift=1` when a gift is expected; poll briefly for the webhook to land.
    // The Stripe redirect carries no flag and reads once.
    const isGiftExpected = getRouteQuery('gift') === '1'
    const MAX_GIFT_RETRIES = 4
    // Suppress the error dialog while polling through expected webhook lag;
    // only surface one on the final attempt. The Stripe path reads once.
    let gift: {
      giftNFTClassId?: string
      giftCartId?: string
      giftPaymentId?: string
      giftClaimToken?: string
    } = await fetchPlusGiftStatus({ shouldHandleError: !isGiftExpected })
    let giftRetry = 0
    while (
      isGiftExpected
      && !(gift.giftNFTClassId && gift.giftCartId && gift.giftPaymentId && gift.giftClaimToken)
      && giftRetry < MAX_GIFT_RETRIES
    ) {
      await sleep(5000)
      giftRetry++
      gift = await fetchPlusGiftStatus({ shouldHandleError: giftRetry === MAX_GIFT_RETRIES })
    }
    const {
      giftNFTClassId,
      giftCartId,
      giftPaymentId,
      giftClaimToken,
    } = gift
    if (isRedirected.value) {
      // Restore the persisted currency before logging: post-Stripe-redirect the
      // payment-currency state is fresh 'auto' and resolves to USD until
      // geolocation lands, which would mislabel the analytics value/currency.
      await initializePaymentCurrency()
      const isTrial = getRouteQuery('trial') !== '0'

      const PREDICTED_LTV_USD = 100
      const TRIAL_TO_PAID_CONVERSION = 0.5

      const conversionValue = isTrial
        ? convertPrice(PREDICTED_LTV_USD * TRIAL_TO_PAID_CONVERSION)
        : (isYearly.value ? yearlyPrice.value : monthlyPrice.value)
      const conversionPredictedLTV = convertPrice(
        isTrial ? PREDICTED_LTV_USD * TRIAL_TO_PAID_CONVERSION : PREDICTED_LTV_USD,
      )
      const conversionParams = {
        transaction_id: paymentId.value,
        currency: currency.value,
        value: conversionValue,
        predicted_ltv: conversionPredictedLTV,
        promotion_id: coupon.value,
        promotion_name: coupon.value,
      }
      useLogEvent(isTrial ? 'start_trial' : 'subscribe', conversionParams)
      // Unified acquisition signal across web trial / web direct / app IAP
      // (mirrored server-side from Stripe + RevenueCat). Optimize Meta on this.
      useLogEvent('plus_acquisition', { ...conversionParams, is_trial: isTrial })

      await navigateTo(localeRoute({
        name: getRouteBaseName(route),
        query: {
          ...route.query,
          redirect: undefined,
        },
      }), { replace: true })
    }

    if (giftNFTClassId && giftCartId && giftPaymentId && giftClaimToken) {
      accountStore.savePlusRedirectRoute(null)
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
      const redirectRoute = accountStore.plusRedirectRoute

      if (redirectRoute && redirectRoute.name) {
        // Book-purchase/upsell: return to the book the user came from.
        accountStore.savePlusRedirectRoute(null)
        await navigateTo(localeRoute(redirectRoute), { replace: true })
      }
      else if (affiliateFrom.value) {
        // Pure member who subscribed through an affiliate: land on the affiliate's
        // curated store view so the exclusive voice has somewhere to point, instead
        // of the bare store where every book looks like it has the affiliate voice.
        await navigateTo(localeRoute({
          name: 'store',
          query: { affiliate: affiliateFrom.value, welcome: '1' },
        }), { replace: true })
      }
      else {
        isRefreshing.value = false
        setTimeout(redirectToLibrary, 1000)
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

async function redirectToLibrary() {
  // Guard against a double fire — the auto setTimeout and a user button click can
  // both call this, overlapping navigations or stranding the redirecting state.
  if (isRedirecting.value) return
  isRedirecting.value = true
  try {
    // Library (not store) surfaces the books they can now read with Plus;
    // `welcome` triggers the greeting banner there.
    await navigateTo(localeRoute({ name: 'library', query: { welcome: '1' } }))
  }
  catch (error) {
    await handleError(error)
    isRedirecting.value = false
  }
}
</script>
