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
  const runtimeConfig = useRuntimeConfig()
  const embeddedCheckoutABTest = useABTest({ experimentKey: 'plus-embedded-checkout' })

  const isProcessingSubscription = ref(false)

  const { handleError } = useErrorHandler()

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
        const canUseEmbeddedCheckout = (
          !isApp.value
          && embeddedCheckoutABTest.isVariant('test')
          && !!runtimeConfig.public.stripePublishableKey
        )
        const uiMode: CheckoutUIMode = canUseEmbeddedCheckout ? 'embedded' : 'hosted'
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
