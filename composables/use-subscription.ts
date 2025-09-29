import { PaywallModal, UpsellPlusModal } from '#components'
import type { PaywallModalProps } from '~/components/PaywallModal.props'
import type { UpsellPlusModalProps, UpsellPlusModalSubscribeEventPayload } from '~/components/UpsellPlusModal.props'

export function useSubscription() {
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { t: $t } = useI18n()
  const accountStore = useAccountStore()
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()
  const toast = useToast()
  const { getAnalyticsParameters } = useAnalytics()

  const selectedPlan = ref<SubscriptionPlan>('yearly')
  const isProcessingSubscription = ref(false)

  const { handleError } = useErrorHandler()

  const {
    monthlyPrice,
    yearlyPrice,
  } = useSubscriptionPricing()

  const paywallModalProps = ref<PaywallModalProps>({})
  const currency = ref('USD')
  const PLUS_BOOK_PURCHASE_DISCOUNT = 0.2 // 20% discount
  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const likerPlusPeriod = computed(() => {
    if (!hasLoggedIn.value || !isLikerPlus.value) return undefined
    return user.value?.likerPlusPeriod || undefined
  })

  const eventPayload = computed(() => ({
    currency: currency.value,
    value: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
    items: [{
      id: `plus-${selectedPlan.value}`,
      name: `Plus (${selectedPlan.value})`,
      price: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
      currency: currency.value,
      quantity: 1,
    }],
  }))

  function getPaywallModalProps(): PaywallModalProps {
    return {
      'modelValue': selectedPlan.value,
      'isProcessingSubscription': isProcessingSubscription.value,
      'onUpdate:modelValue': (value: SubscriptionPlan) => {
        selectedPlan.value = value
        useLogEvent('select_item', eventPayload.value)
      },
      'onOpen': () => {
        useLogEvent('view_item', eventPayload.value)
      },
      'onSubscribe': startSubscription,
    }
  }

  function getUpsellPlusModalProps(): UpsellPlusModalProps {
    return {
      isLikerPlus: isLikerPlus.value,
      likerPlusPeriod: likerPlusPeriod.value,
      onSubscribe: startSubscription,
      onClose: () => useLogEvent('subscription_button_click_skip'),
    }
  }

  const overlay = useOverlay()
  const paywallModal = overlay.create(PaywallModal, {
    props: getPaywallModalProps(),
  })
  const upsellPlusModal = overlay.create(UpsellPlusModal, {
    props: getUpsellPlusModalProps(),
  })

  async function openPaywallModal(props: PaywallModalProps = {}) {
    if (paywallModal.isOpen) {
      paywallModal.close()
    }

    paywallModalProps.value = {
      ...getPaywallModalProps(),
      ...props,
    }
    return paywallModal.open(paywallModalProps.value).result
  }

  async function openUpsellPlusModalIfEligible(props: UpsellPlusModalProps = {}) {
    if (upsellPlusModal.isOpen) {
      upsellPlusModal.close()
    }

    if (!isLikerPlus.value || likerPlusPeriod.value === 'month') {
      const upsellModalProps: UpsellPlusModalProps = {
        ...props,
        ...getUpsellPlusModalProps(),
      }
      useLogEvent('upsell_plus_modal_open')
      return upsellPlusModal.open(upsellModalProps).result
    }
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
    plan,
    nftClassId,
    redirectRoute,
  }: UpsellPlusModalSubscribeEventPayload = {}) {
    const subscribePlan = plan || selectedPlan.value
    const isYearly = subscribePlan === 'yearly'
    useLogEvent('add_to_cart', eventPayload.value)
    useLogEvent(`subscription_button_click_${subscribePlan}`)

    const isSubscribed = await redirectIfSubscribed(subscribePlan)
    if (isSubscribed) return
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }

    if (isProcessingSubscription.value) return
    try {
      isProcessingSubscription.value = true

      if (!user.value?.likerId) {
        toast.add({
          title: $t ('pricing_page_liker_id_required'),
          description: $t('pricing_page_liker_id_required_description'),
          color: 'warning',
        })
        isProcessingSubscription.value = false
        return
      }
      useLogEvent('begin_checkout', eventPayload.value)

      const analyticsParams = getAnalyticsParameters()
      if (isLikerPlus.value) {
        await likeCoinSessionAPI.updateLikerPlusSubscription({
          period: subscribePlan,
          giftNFTClassId: isYearly ? nftClassId : undefined,
        })
        await sleep(3000)
        await navigateTo(localeRoute({ name: 'plus-success' }))
      }
      else {
        const { url } = await likeCoinSessionAPI.fetchLikerPlusCheckoutLink({
          period: subscribePlan,
          from: getRouteQuery('from'),
          trialPeriodDays,
          mustCollectPaymentMethod,
          giftNFTClassId: isYearly ? nftClassId : undefined,
          ...analyticsParams,
          utmCampaign: analyticsParams.utmCampaign || utmCampaign,
          utmMedium: analyticsParams.utmMedium || utmMedium,
          utmSource: analyticsParams.utmSource || utmSource,
        })
        if (redirectRoute && redirectRoute?.name) {
          accountStore.savePlusRedirectRoute(redirectRoute)
        }
        await navigateTo(url, { external: true })
      }
    }
    catch (error) {
      handleError(error)
    }
    finally {
      isProcessingSubscription.value = false
    }
  }

  function getPlusDiscountPrice(price: number): number | null {
    if (isLikerPlus.value && price > 0) {
      return Math.round(price * (1 - PLUS_BOOK_PURCHASE_DISCOUNT) * 100) / 100
    }
    return null
  }

  function getPlusDiscountRate(): number {
    if (isLikerPlus.value) {
      return (1 - PLUS_BOOK_PURCHASE_DISCOUNT)
    }
    return 0
  }

  watch(isProcessingSubscription, (newValue) => {
    paywallModal.patch({
      ...paywallModalProps.value,
      isProcessingSubscription: newValue,
    })
  })

  return {
    yearlyPrice,
    monthlyPrice,
    currency,

    isLikerPlus,
    likerPlusPeriod,
    getPlusDiscountPrice,
    getPlusDiscountRate,
    isProcessingSubscription,

    openPaywallModal,
    openUpsellPlusModalIfEligible,
    redirectIfSubscribed,
    startSubscription,
  }
}
