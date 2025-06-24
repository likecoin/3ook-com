import { PaywallModal } from '#components'

export function useSubscription() {
  const { t: $t } = useI18n()
  const { user } = useUserSession()
  const selectedPlan = ref('yearly')
  const { loggedIn: hasLoggedIn } = useUserSession()
  const accountStore = useAccountStore()
  const isProcessingSubscription = ref(false)
  const { handleError } = useErrorHandler()
  const localeRoute = useLocaleRoute()
  const toast = useToast()

  // TODO: Don't hardcode prices here
  const yearlyPrice = ref(69.99)
  const monthlyPrice = ref(6.99)
  const currency = ref('USD')
  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const eventPayload = computed(() => ({
    currency: currency.value,
    value: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
    items: [{
      id: `plus-beta-${selectedPlan.value}`,
      name: `Plus Beta (${selectedPlan.value})`,
      price: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
      currency: currency.value,
      quantity: 1,
    }],
  }))

  const overlay = useOverlay()
  const paywallModal = overlay.create(PaywallModal, {
    props: {
      'modelValue': toRef(selectedPlan, 'value'),
      'onUpdate:modelValue': (val: 'monthly' | 'yearly') => {
        selectedPlan.value = val
        useLogEvent('select_item', eventPayload.value)
      },
      'onOpen': () => {
        useLogEvent('view_item', eventPayload.value)
      },
      'onSubscribe': startSubscription,
      'discountedYearlyPrice': yearlyPrice.value,
      'discountedMonthlyPrice': monthlyPrice.value,
      isProcessingSubscription,
    },
  })

  async function redirectIfSubscribed() {
    if (isLikerPlus.value) {
      await navigateTo(localeRoute({ name: 'account' }))
      return true
    }
    return false
  }

  async function startSubscription() {
    useLogEvent('add_to_cart', eventPayload.value)
    useLogEvent('subscription_button_click', { plan: selectedPlan.value })

    const isSubscribed = await redirectIfSubscribed()
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

      const { url } = await fetchLikerPlusCheckoutLink({
        period: selectedPlan.value as 'monthly' | 'yearly',
      })
      await navigateTo(url, { external: true })
    }
    catch (error) {
      handleError(error)
    }
    finally {
      isProcessingSubscription.value = false
    }
  }

  return {
    paywallModal,

    yearlyPrice,
    monthlyPrice,
    currency,

    isLikerPlus,
    isProcessingSubscription,

    redirectIfSubscribed,
    startSubscription,
  }
}
