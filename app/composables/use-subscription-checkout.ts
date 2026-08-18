import type { UpsellPlusModalSubscribeEventPayload } from '~/components/UpsellPlusModal.props'
import type { CheckoutUIMode } from '~/composables/use-plus-session-api'
import type { PlusCheckoutPlacement } from '~~/shared/constants/analytics'
import { usePlusCheckoutStore } from '~/stores/plus-checkout'

// The modal emits the payload; the opener adds the placement, which is
// analytics-only and never reaches checkout metadata.
export type StartSubscriptionOptions = UpsellPlusModalSubscribeEventPayload & {
  checkoutPlacement?: PlusCheckoutPlacement
}

export function useSubscriptionCheckout() {
  const {
    currency,
    getTierPrice,
    isLikerPlus,
    isCivicMember,
    isPlanPeriodUpgrade,
    hasLoggedIn,
    getCheckoutCurrency,
  } = useSubscription()

  const plusSessionAPI = usePlusSessionAPI()
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
  const { isCivicOfferable } = usePlusEligibility()
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
  const SESSION_POLL_MAX_ATTEMPTS = 6
  const SESSION_POLL_DELAY_MS = 2000

  async function pollSessionUntilPlus(requiredTier: LikerPlusTier = 'plus'): Promise<boolean> {
    // A Civic purchase must not read a webhook that only landed as Plus (or a
    // pre-existing Plus flag) as success — poll until the tier itself flips.
    const hasEntitlement = () => (requiredTier === 'civic' ? isCivicMember.value : isLikerPlus.value)
    for (let attempt = 0; attempt < SESSION_POLL_MAX_ATTEMPTS; attempt++) {
      // Best-effort: a transient refresh failure must not throw out of here. The
      // store purchase already succeeded, so the user should still reach the
      // success page (which re-polls) instead of being stranded on checkout.
      try {
        await accountStore.refreshSessionInfo()
      }
      catch {
        // ignore and retry on the next attempt
      }
      if (hasEntitlement()) return true
      if (attempt < SESSION_POLL_MAX_ATTEMPTS - 1) {
        await sleep(SESSION_POLL_DELAY_MS)
      }
    }
    return hasEntitlement()
  }

  async function redirectIfSubscribed({
    plan,
    tier = 'plus',
  }: {
    plan?: string
    tier?: LikerPlusTier
  } = {}) {
    if (!isLikerPlus.value) return false
    // Proceed (no redirect) for in-place upgrades: Plus→Civic, or monthly→yearly.
    const isTierUpgrade = tier === 'civic' && !isCivicMember.value
    const isPeriodUpgrade = isPlanPeriodUpgrade(plan as SubscriptionPlan)
    if (isTierUpgrade || isPeriodUpgrade) return false
    await navigateTo(localeRoute({ name: 'account' }))
    return true
  }

  async function startSubscription({
    trialPeriodDays = 0,
    mustCollectPaymentMethod = true,
    utmCampaign,
    utmMedium,
    utmSource,
    checkoutPlacement,
    coupon = getRouteQuery('coupon'),
    plan = 'yearly',
    tier = 'plus',
    nftClassId,
    redirectRoute,
  }: StartSubscriptionOptions = {}) {
    const isYearly = plan === 'yearly'
    const isCivicTier = tier === 'civic'
    if (isCivicTier) {
      // Civic has no trial (product decision) — the backend 400s on it too — and
      // the gift book is a Plus-only promo, so never attach one to a Civic purchase.
      trialPeriodDays = 0
      nftClassId = undefined
    }
    const price = getTierPrice(tier, plan)
    const tierName = isCivicTier ? 'Civic' : 'Plus'
    const eventPayload = {
      currency: currency.value,
      value: price,
      product_type: tier,
      items: [{
        id: `${tier}-${plan}`,
        name: `${tierName} (${plan})`,
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
    // No `value`: GA4 reads it as revenue, and the add_to_cart above already
    // reports this amount for this click. No `nft_class_id` either — here it is
    // the attached gift book, not the book that drove the upsell.
    const subscriptionClickPayload = {
      currency: currency.value,
      product_type: tier,
      plan,
      checkout_placement: checkoutPlacement,
    }
    useLogEvent('subscription_button_click', subscriptionClickPayload)
    useLogEvent(`subscription_button_click_${plan}`, subscriptionClickPayload)

    const isSubscribed = await redirectIfSubscribed({ plan, tier })
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
      // Old shells would silently buy Plus from the default offering, and an IAP
      // over a plan billed elsewhere would stack a second subscription rather
      // than replace it. Callers hide the option; this is the flow-level backstop.
      if (isCivicTier && !isCivicOfferable.value) {
        useLogEvent(isLikerPlus.value
          ? 'subscription_iap_civic_wrong_billing_source'
          : 'subscription_iap_civic_unsupported')
        toast.add({
          title: $t('plus_checkout_error_description'),
          color: 'warning',
        })
        return
      }
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
        // First-touch gets no tombstone (unlike plusGiftClassId above): RevenueCat's
        // per-subscriber stickiness is wanted here, and blanking it on a later
        // session with no first-touch would erase the real acquisition source.
        setAttribute('initialUtmSource', analyticsParams.initialUtmSource)
        setAttribute('initialUtmMedium', analyticsParams.initialUtmMedium)
        setAttribute('initialUtmCampaign', analyticsParams.initialUtmCampaign)
        // Mirrored by the native shell onto RevenueCat's reserved $mediaSource /
        // $campaign.
        setAttribute('mediaSource', analyticsParams.mediaSource)
        setAttribute('campaign', analyticsParams.campaign)
        setAttribute('referrer', analyticsParams.referrer)
        setAttribute('posthogDistinctId', analyticsParams.posthogDistinctId)
        // Reflects THIS purchase's attribution origin. Unlike the sticky values
        // above it must be cleared on live-attributed purchases, else a prior
        // install flag persists (RC attributes are sticky). '' is the tombstone,
        // as with plusGiftClassId. See useAnalytics.
        attributes.attributionSource = analyticsParams.attributionSource || ''

        const result = await purchaseViaIAP({
          period: plan,
          likerId: user.value.likerId,
          attributes,
          tier,
        })
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
        const isPlusConfirmed = await pollSessionUntilPlus(tier)
        // Only once the backend has actually granted Plus: asking on the store's
        // purchase result would catch the user while the app still shows them as a
        // non-subscriber, since the webhook can lag. A slow webhook means no prompt.
        if (isPlusConfirmed) requestNativeStoreReview('purchase_confirmed')
        // Flag a pending gift so the success page waits for the webhook to attach the
        // book (the cart is created async on grant) before routing to the claim page.
        const hasGift = isYearly && Boolean(nftClassId)
        await navigateTo(localeRoute({
          name: 'plus-success',
          query: {
            period: plan,
            ...(isCivicTier ? { tier } : {}),
            ...(hasGift ? { gift: '1' } : {}),
          },
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
        await plusSessionAPI.updateLikerPlusSubscription({
          period: plan,
          tier,
          giftNFTClassId: isYearly ? nftClassId : undefined,
        })
        // The in-place upgrade skips the success-page redirect that fires
        // conversions for new subscribers. A Plus→Civic tier upgrade is a real
        // paid conversion worth signalling; a monthly→yearly period change is not
        // an acquisition, so keep it out of the Meta-optimized acquisition event.
        if (isCivicTier) {
          useLogEvent('subscribe', eventPayloadWithCoupon)
          useLogEvent('plus_acquisition', { ...eventPayloadWithCoupon, is_trial: false })
        }
        await navigateTo(localeRoute({
          name: 'plus-success',
          query: { period: plan, ...(isCivicTier ? { tier } : {}) },
        }))
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
        const { url, clientSecret, paymentId } = await plusSessionAPI.fetchLikerPlusCheckoutLink({
          period: plan,
          tier,
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
            tier,
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
