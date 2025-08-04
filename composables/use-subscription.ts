import { PaywallModal, UpsellPlusModal } from '#components'
import type { PaywallModalProps } from '~/components/PaywallModal.props'
import type { UpsellPlusModalProps } from '~/components/UpsellPlusModal.props'

export function useSubscription() {
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { t: $t } = useI18n()
  const accountStore = useAccountStore()
  const metadataStore = useMetadataStore()
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()
  const toast = useToast()
  const { getAnalyticsParameters } = useAnalytics()

  const YEARLY_GIFT_BOOKS = [
    // 屋宇平民誌
    '0x883c0a578412616f6490f345fab83008a3fb79ca',
    '0x54255b9f281400f8b79c3a9e87dc375072b1c8e0',
  ]

  const selectedPlan = ref<SubscriptionPlan>('yearly')
  const isProcessingSubscription = ref(false)
  const isUpsellingPlus = ref(false)

  const { handleError } = useErrorHandler()

  const modalProps = ref<PaywallModalProps>({})
  // TODO: Don't hardcode prices here
  const yearlyPrice = ref(69.99)
  const monthlyPrice = ref(6.99)
  const currency = ref('USD')
  const PLUS_DISCOUNT_PERCENTAGE = 0.2 // 20% discount
  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const likerPlusPeriod = computed(() => {
    if (!hasLoggedIn.value || !isLikerPlus.value) return undefined
    const likerInfo = metadataStore.getLikerInfoById(user.value?.likerId)
    return likerInfo?.likerPlusPeriod
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

  function getPaywallModalProps(): PaywallModalProps {
    return {
      'modelValue': selectedPlan.value,
      'discountedYearlyPrice': yearlyPrice.value,
      'discountedMonthlyPrice': monthlyPrice.value,
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
      onSubscribe: startSubscription,
      onClose: () => {
        isUpsellingPlus.value = false
      },
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

    modalProps.value = {
      ...getPaywallModalProps(),
      ...props,
    }
    return paywallModal.open(modalProps.value).result
  }

  async function openUpsellPlusModal(props: UpsellPlusModalProps = {}) {
    if (upsellPlusModal.isOpen) {
      upsellPlusModal.close()
    }
    const upsellModalProps: UpsellPlusModalProps = {
      ...props,
      ...getUpsellPlusModalProps(),
    }

    return upsellPlusModal.open(upsellModalProps).result
  }

  async function redirectIfSubscribed() {
    if (isLikerPlus.value) {
      await navigateTo(localeRoute({ name: 'account' }))
      return true
    }
    return false
  }

  async function startSubscription({
    hasFreeTrial = false,
    mustCollectPaymentMethod = true,
    utmCampaign,
    utmMedium,
    utmSource,
    plan,
  }: {
    hasFreeTrial?: boolean
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    plan?: SubscriptionPlan
  } = {}) {
    const subscribePlan = plan || selectedPlan.value
    useLogEvent('add_to_cart', eventPayload.value)
    useLogEvent('subscription_button_click', { plan: subscribePlan })

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

      const analyticsParams = getAnalyticsParameters()
      const { url } = await likeCoinSessionAPI.fetchLikerPlusCheckoutLink({
        period: subscribePlan,
        from: getRouteQuery('from'),
        hasFreeTrial,
        mustCollectPaymentMethod,
        ...analyticsParams,
        utmCampaign: utmCampaign || analyticsParams.utmCampaign,
        utmMedium: utmMedium || analyticsParams.utmMedium,
        utmSource: utmSource || analyticsParams.utmSource,
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

  function getPlusDiscountPrice(price: number): number | null {
    if (isLikerPlus.value && price > 0) {
      return Math.round(price * (1 - PLUS_DISCOUNT_PERCENTAGE))
    }
    return null
  }

  async function fetchLikerPlusStatus() {
    if (!hasLoggedIn.value || !isLikerPlus.value || !user.value?.likerId) return
    try {
      await metadataStore.lazyFetchLikerPlusStatus(user.value.likerId)
    }
    catch (error) {
      console.error('Failed to fetch liker plus status:', error)
    }
  }

  function isYearlyGiftBook(nftClassId: string): boolean {
    return YEARLY_GIFT_BOOKS.includes(nftClassId)
  }

  watch(isProcessingSubscription, (newValue) => {
    paywallModal.patch({
      ...modalProps.value,
      isProcessingSubscription: newValue,
    })
  })

  return {
    user,
    yearlyPrice,
    monthlyPrice,
    currency,

    isLikerPlus,
    likerPlusPeriod,
    getPlusDiscountPrice,
    fetchLikerPlusStatus,
    isProcessingSubscription,
    isUpsellingPlus,
    isYearlyGiftBook,

    openPaywallModal,
    openUpsellPlusModal,
    redirectIfSubscribed,
    startSubscription,
  }
}
