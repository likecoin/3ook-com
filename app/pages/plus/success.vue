<template>
  <main class="items-center justify-center w-full max-w-xl mx-auto p-4 space-y-4 text-center">
    <!-- The check shows while the session refreshes, then flips on the Y axis
         to reveal the stamped avatar once the entitlement lands. -->
    <PlusMembershipTada
      class="mx-auto mb-4"
      :has-landed="hasMembershipLanded"
    />

    <h1
      class="mb-2 text-2xl font-bold"
      v-text="$t('subscription_success_title')"
    />
    <p
      class="mb-6 text-muted"
      v-text="$t(isCivic
        ? 'subscription_success_description_civic'
        : 'subscription_success_description')"
    />

    <UButton
      v-if="!isRefreshing"
      :label="$t(isCivic
        ? 'subscription_success_continue_button_civic'
        : 'subscription_success_continue_button')"
      color="primary"
      :loading="isRedirecting"
      @click="isCivic ? redirectToAccount() : redirectToLibrary()"
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
import type { RouteLocationRaw } from 'vue-router'

import { PLUS_TADA_TOTAL_MS } from '~/components/PlusMembershipTada.vue'

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const {
  currency,
  getTierPrice,
  isCivicMember,
} = useSubscription()
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
// The IAP/upgrade flows pass `tier=civic`; the hosted-Stripe redirect doesn't,
// so also read the refreshed session's tier once it lands.
const isCivicExpected = computed(() => getRouteQuery('tier') === 'civic')
const isCivic = computed(() => isCivicExpected.value || isCivicMember.value)
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
// A Plus→Civic upgrade leaves `isLikerPlus` already true, so the refresh loop
// would exit before the tier flips. When the checkout signalled Civic, hold the
// loop until the session actually reports Civic so /account reflects it.
const isTierMatch = computed(() => !isCivicExpected.value || isCivicMember.value)

// The tada marks the entitlement landing, not the page loading — it is part
// of the refresh loop's exit condition below. Guarded on isLikerPlus because
// that loop can exhaust its retries without the session ever reporting a member.
const hasMembershipLanded = computed(() => isLikerPlus.value && isTierMatch.value)

const preferredMotion = usePreferredReducedMotion()

// Slack over the component's summed sequence so the shimmer fully lands
// before any branch below navigates away.
const PLUS_TADA_HOLD_MS = PLUS_TADA_TOTAL_MS + 180
// Re-armed on every rising edge, not just the first: a failed session fetch
// mid-poll flaps this false and replays the tada from zero against what
// would otherwise be a spent origin.
const tadaStartedAt = ref<number | null>(null)
watch(hasMembershipLanded, (value) => {
  if (value) tadaStartedAt.value = performance.now()
}, { immediate: true })

// Measured from when the tada started rather than from the call site: the
// gift poll above can already have outlasted it. Monotonic on purpose — a
// device clock correction across those polls would otherwise stretch the hold.
async function holdForTada() {
  if (tadaStartedAt.value === null || preferredMotion.value === 'reduce') return
  const remaining = PLUS_TADA_HOLD_MS - (performance.now() - tadaStartedAt.value)
  if (remaining > 0) await sleep(remaining)
}

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
    while (!(hasMembershipLanded.value && isPeriodMatch.value) && retry < 4) {
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
    // Only a fresh checkout (redirect) or an explicitly gift-flagged purchase can
    // bring a gift to claim. An in-place upgrade (Plus→Civic, monthly→yearly) carries
    // neither, so it must NOT read the subscription's pre-existing gift cart and
    // wrongly re-open the claim UI post-upgrade.
    const shouldCheckGift = isRedirected.value || isGiftExpected
    // Suppress the error dialog while polling through expected webhook lag;
    // only surface one on the final attempt. The Stripe path reads once.
    let gift: {
      giftNFTClassId?: string
      giftCartId?: string
      giftPaymentId?: string
      giftClaimToken?: string
    } = shouldCheckGift
      ? await fetchPlusGiftStatus({ shouldHandleError: !isGiftExpected })
      : {}
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
      // Civic has no trial, so never log one for it regardless of the query flag.
      const isTrial = !isCivic.value && getRouteQuery('trial') !== '0'

      const PREDICTED_LTV_USD = 100
      const TRIAL_TO_PAID_CONVERSION = 0.5

      // Civic's 10× sticker is a real paid conversion — value it at the Civic
      // price, not the Plus price, so ad optimization isn't fed a low number.
      const paidPrice = getTierPrice(
        isCivic.value ? 'civic' : 'plus',
        isYearly.value ? 'yearly' : 'monthly',
      )
      const conversionValue = isTrial
        ? convertPrice(PREDICTED_LTV_USD * TRIAL_TO_PAID_CONVERSION)
        : paidPrice
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

    const hasGiftToClaim = !!(giftNFTClassId && giftCartId && giftPaymentId && giftClaimToken)
    const redirectRoute = accountStore.plusRedirectRoute
    // Only the branches that stay put swap the loading state for the CTA before
    // the hold. The others hand off elsewhere, where that CTA would point at the
    // library or the account rather than at where the user is about to be sent.
    const shouldShowContinueButton = !hasGiftToClaim
      && (isCivic.value || !(redirectRoute?.name || affiliateFrom.value))
    if (shouldShowContinueButton) isRefreshing.value = false
    // Every branch below leaves within a second or instantly, so the tada
    // only has somewhere to play if the page is held open first.
    await holdForTada()

    if (hasGiftToClaim) {
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
    else if (isCivic.value) {
      // Civic has no library "welcome" to show — the payoff is on the account
      // page (Civic status, member seat-sharing, concierge), so land there.
      accountStore.savePlusRedirectRoute(null)
      setTimeout(redirectToAccount, 1000)
    }
    else if (redirectRoute && redirectRoute.name) {
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
      setTimeout(redirectToLibrary, 1000)
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

async function redirectTo(to: RouteLocationRaw) {
  // Guard against a double fire — the auto setTimeout and a user button click can
  // both call this, overlapping navigations or stranding the redirecting state.
  if (isRedirecting.value) return
  isRedirecting.value = true
  try {
    await navigateTo(localeRoute(to))
  }
  catch (error) {
    await handleError(error)
    isRedirecting.value = false
  }
}

// Library (not store) surfaces the books they can now read with Plus;
// `welcome` triggers the greeting banner there.
const redirectToLibrary = () => redirectTo({ name: 'library', query: { welcome: '1' } })
const redirectToAccount = () => redirectTo({ name: 'account' })
</script>
