import type { UpsellPlusModalSubscribeEventPayload } from '~/components/UpsellPlusModal.props'
import type { CheckoutUIMode } from '~/composables/use-likecoin-session-api'
import { usePlusCheckoutStore } from '~/stores/plus-checkout'

export function useSubscriptionCheckout() {
  const {
    yearlyPrice,
    monthlyPrice,
    currency,
    isLikerPlus,
    likerPlusPeriod,
    hasLoggedIn,
    getCheckoutCurrency,
  } = useSubscription()

  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { t: $t } = useI18n()
  const accountStore = useAccountStore()
  const plusCheckoutStore = usePlusCheckoutStore()
  const { user } = useUserSession()
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()
  const toast = useToast()
  const blockingModal = useBlockingModal()
  const { getAnalyticsParameters } = useAnalytics()
  const { isApp } = useAppDetection()
  const { isIAPSupported, purchase: purchaseViaIAP } = useNativeIAP()
  const runtimeConfig = useRuntimeConfig()
  // Defer exposure to the checkout decision point (post-login) instead of mount,
  // so only treatment-eligible users are counted and we avoid re-bucketing across
  // the login boundary (the cause of the earlier sample-ratio mismatch).
  const embeddedCheckoutABTest = useABTest({
    experimentKey: 'plus-embedded-checkout',
    manualExposure: true,
  })

  const isProcessingSubscription = ref(false)

  const { handleError } = useErrorHandler()

  // Backend-webhook model: after a native purchase, RevenueCat notifies our
  // backend which flips `isLikerPlus`. Re-fetch the session a few times to
  // absorb webhook latency rather than trusting the device for entitlement.
  async function pollSessionUntilPlus(maxAttempts = 6, delayMs = 2000): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Best-effort: a transient refresh failure must not throw out of here. The
      // store purchase already succeeded, so the user should still reach the
      // success page (which re-polls) instead of being stranded on checkout.
      try {
        await accountStore.refreshSessionInfo()
      }
      catch {
        // ignore and retry on the next attempt
      }
      if (isLikerPlus.value) return true
      if (attempt < maxAttempts - 1) {
        await sleep(delayMs)
      }
    }
    return isLikerPlus.value
  }

  async function redirectIfSubscribed(plan?: string) {
    if (isLikerPlus.value && (!plan || likerPlusPeriod.value !== 'month' || plan !== 'yearly')) {
      await navigateTo(localeRoute({ name: 'account' }))
      return true
    }
    return false
  }

  async function startSubscription({
    trialPeriodDays = 0,
    mustCollectPaymentMethod = true,
    utmCampaign,
    utmMedium,
    utmSource,
    coupon = getRouteQuery('coupon'),
    plan = 'yearly',
    nftClassId,
    redirectRoute,
  }: UpsellPlusModalSubscribeEventPayload = {}) {
    const isYearly = plan === 'yearly'
    const price = isYearly ? yearlyPrice.value : monthlyPrice.value
    const eventPayload = {
      currency: currency.value,
      value: price,
      product_type: 'plus',
      items: [{
        id: `plus-${plan}`,
        name: `Plus (${plan})`,
        price,
        currency: currency.value,
        quantity: 1,
      }],
    }
    const eventPayloadWithCoupon = {
      ...eventPayload,
      promotion_id: coupon,
      promotion_name: coupon,
    }
    useLogEvent('add_to_cart', eventPayloadWithCoupon)
    useLogEvent('subscription_button_click')
    useLogEvent(`subscription_button_click_${plan}`)

    const isSubscribed = await redirectIfSubscribed(plan)
    if (isSubscribed) return
    if (!hasLoggedIn.value) {
      useLogEvent('subscription_login_required')
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }

    // In the native app, route Plus purchases through StoreKit / Play Billing
    // (RevenueCat) instead of Stripe. RevenueCat is keyed by likerId (the backend
    // internal user id) already synced via `identifyUser`; entitlement truth still
    // comes from the backend session, so poll it after a successful purchase.
    if (isIAPSupported.value) {
      if (isProcessingSubscription.value) return
      // RevenueCat is keyed by likerId (the backend internal user id), so a
      // missing likerId can't attribute the purchase — gate it like Stripe does.
      if (!user.value?.likerId) {
        useLogEvent('subscription_liker_id_required')
        toast.add({
          title: $t('pricing_page_liker_id_required'),
          description: $t('pricing_page_liker_id_required_description'),
          color: 'warning',
        })
        return
      }
      // Coupons can't be honored by store IAP (the store controls pricing). A gift
      // NFT only attaches to yearly, so a gift on a monthly plan is dropped. Yearly
      // gifts + affiliate attribution + ad-attribution DO carry through, as RevenueCat
      // subscriber attributes set natively before purchase (see below). We still
      // complete the purchase when an option is unsupported, but log to measure
      // exposure. trialPeriodDays / mustCollectPaymentMethod are intentionally
      // excluded: store IAP applies its own intro offers, so they aren't a mismatch.
      const hasUnsupportedGift = Boolean(nftClassId) && !isYearly
      if (coupon || hasUnsupportedGift) {
        useLogEvent('subscription_iap_unsupported_options', {
          has_coupon: Boolean(coupon),
          has_unsupported_gift: hasUnsupportedGift,
        })
      }
      try {
        isProcessingSubscription.value = true
        useLogEvent('begin_checkout', eventPayloadWithCoupon)
        // The native purchase carries no metadata, so pass the gift book, affiliate
        // channel, and ad-attribution as RevenueCat subscriber attributes. The native
        // shell sets them before purchase and the grant webhook reads them back — the
        // IAP equivalent of Stripe checkout metadata. Drop empty attribution values so
        // we never overwrite an attribute with a blank.
        const from = getRouteQuery('from')
        const analyticsParams = getAnalyticsParameters()
        const attributes: Record<string, string> = {}
        const setAttribute = (key: string, value?: string | null) => {
          if (value) attributes[key] = value
        }
        // Always send plusGiftClassId — unlike attribution, it must be cleared, not
        // kept. RevenueCat attributes are sticky per-subscriber, so a non-gift
        // purchase after a prior gift would otherwise inherit the stale class id and
        // the webhook would re-grant the book. Empty string is the webhook's tombstone
        // for "no gift". Gift only attaches to yearly.
        attributes.plusGiftClassId = isYearly && nftClassId ? nftClassId : ''
        setAttribute('plusFrom', from)
        setAttribute('fbClickId', analyticsParams.fbClickId)
        setAttribute('fbp', analyticsParams.fbp)
        setAttribute('fbc', analyticsParams.fbc)
        setAttribute('gaClientId', analyticsParams.gaClientId)
        setAttribute('gaSessionId', analyticsParams.gaSessionId)
        setAttribute('gadClickId', analyticsParams.gadClickId)
        setAttribute('gadSource', analyticsParams.gadSource)
        setAttribute('utmSource', analyticsParams.utmSource || utmSource)
        setAttribute('utmMedium', analyticsParams.utmMedium || utmMedium)
        setAttribute('utmCampaign', analyticsParams.utmCampaign || utmCampaign)
        setAttribute('utmContent', analyticsParams.utmContent)
        setAttribute('utmTerm', analyticsParams.utmTerm)
        setAttribute('referrer', analyticsParams.referrer)
        setAttribute('posthogDistinctId', analyticsParams.posthogDistinctId)
        // Reflects THIS purchase's attribution origin. Unlike the sticky values
        // above it must be cleared on live-attributed purchases, else a prior
        // install flag persists (RC attributes are sticky). '' is the tombstone,
        // as with plusGiftClassId. See useAnalytics.
        attributes.attributionSource = analyticsParams.attributionSource || ''

        const result = await purchaseViaIAP(plan, user.value.likerId, attributes)
        if (result.status === 'cancelled') return
        if (result.status !== 'success') {
          throw createError({
            statusCode: 502,
            message: result.message || 'In-app purchase failed',
            data: {
              description: $t('plus_checkout_error_description'),
            },
          })
        }
        blockingModal.open({ title: $t('common_processing') })
        await pollSessionUntilPlus()
        // Flag a pending gift so the success page waits for the webhook to attach the
        // book (the cart is created async on grant) before routing to the claim page.
        const hasGift = isYearly && Boolean(nftClassId)
        await navigateTo(localeRoute({
          name: 'plus-success',
          query: { period: plan, ...(hasGift ? { gift: '1' } : {}) },
        }))
      }
      catch (error) {
        useLogEvent('subscription_checkout_error', {
          error_message: getErrorMessage(error),
        })
        handleError(error)
      }
      finally {
        isProcessingSubscription.value = false
        blockingModal.close()
      }
      return
    }

    if (isProcessingSubscription.value) return
    try {
      isProcessingSubscription.value = true
      blockingModal.open({ title: $t('common_processing') })

      if (!user.value?.likerId) {
        useLogEvent('subscription_liker_id_required')
        toast.add({
          title: $t('pricing_page_liker_id_required'),
          description: $t('pricing_page_liker_id_required_description'),
          color: 'warning',
        })
        isProcessingSubscription.value = false
        return
      }
      const analyticsParams = getAnalyticsParameters()
      if (isLikerPlus.value) {
        useLogEvent('begin_checkout', eventPayloadWithCoupon)
        await likeCoinSessionAPI.updateLikerPlusSubscription({
          period: plan,
          giftNFTClassId: isYearly ? nftClassId : undefined,
        })
        await navigateTo(localeRoute({ name: 'plus-success', query: { period: plan } }))
      }
      else {
        // Only web Stripe users can receive the treatment — app users always get
        // the hosted flow, so capture exposure here (not on mount) to keep the
        // experiment population clean.
        const isEmbeddedCheckoutEligible = (
          !isApp.value
          && !!runtimeConfig.public.stripePublishableKey
        )
        const embeddedVariant = isEmbeddedCheckoutEligible
          ? embeddedCheckoutABTest.captureExposure()
          : null
        const uiMode: CheckoutUIMode = embeddedVariant === 'test' ? 'embedded' : 'hosted'
        const { url, clientSecret, paymentId } = await likeCoinSessionAPI.fetchLikerPlusCheckoutLink({
          period: plan,
          from: getRouteQuery('from'),
          currency: getCheckoutCurrency(),
          trialPeriodDays,
          mustCollectPaymentMethod,
          giftNFTClassId: isYearly ? nftClassId : undefined,
          ...analyticsParams,
          utmCampaign: analyticsParams.utmCampaign || utmCampaign,
          utmMedium: analyticsParams.utmMedium || utmMedium,
          utmSource: analyticsParams.utmSource || utmSource,
          coupon,
          uiMode,
        })
        useLogEvent('begin_checkout', {
          ...eventPayloadWithCoupon,
          transaction_id: paymentId,
          checkout_mode: uiMode,
        })
        if (redirectRoute && redirectRoute.name) {
          accountStore.savePlusRedirectRoute(redirectRoute)
        }
        if (uiMode === 'embedded' && clientSecret) {
          plusCheckoutStore.setSession({
            clientSecret,
            paymentId,
            period: plan,
            coupon,
            isTrial: trialPeriodDays > 0,
          })
          await navigateTo(localeRoute({ name: 'plus-checkout' }))
        }
        else if (url) {
          await navigateTo(url, { external: true })
        }
        else {
          throw createError({
            statusCode: 502,
            message: 'Checkout session missing both url and clientSecret',
            data: {
              description: $t('plus_checkout_error_description'),
            },
          })
        }
      }
    }
    catch (error) {
      useLogEvent('subscription_checkout_error', {
        error_message: getErrorMessage(error),
      })
      handleError(error)
    }
    finally {
      isProcessingSubscription.value = false
      blockingModal.close()
    }
  }

  return {
    isProcessingSubscription,
    redirectIfSubscribed,
    startSubscription,
  }
}
