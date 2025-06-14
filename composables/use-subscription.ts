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

  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const overlay = useOverlay()
  const paywallModal = overlay.create(PaywallModal, {
    props: {
      handleSubscribe: startSubscription,
      isProcessingSubscription,
    },
  })

  async function checkLikerPlusStatus() {
    try {
      if (!hasLoggedIn.value) {
        await accountStore.login()
        if (!hasLoggedIn.value) return
      }
      if (user.value?.isLikerPlus) {
        navigateTo(localeRoute({ name: 'account' }))
      }
    }
    catch (error) {
      handleError(error)
    }
  }

  async function startSubscription() {
    await checkLikerPlusStatus()
    useTrackEvent('subscription_button_click', { plan: selectedPlan.value })

    if (isProcessingSubscription.value) return

    try {
      isProcessingSubscription.value = true

      if (!hasLoggedIn.value) {
        await accountStore.login()
        if (!hasLoggedIn.value) {
          isProcessingSubscription.value = false
          return
        }
      }
      const { user } = useUserSession()
      if (user.value?.isLikerPlus) {
        navigateTo(localeRoute({ name: 'account' }))
        isProcessingSubscription.value = false
        return
      }
      if (!user.value?.likerId) {
        toast.add({
          title: $t ('pricing_page_liker_id_required'),
          description: $t('pricing_page_liker_id_required_description'),
          color: 'warning',
        })
        isProcessingSubscription.value = false
        return
      }

      const { url } = await fetchLikerPlusCheckoutLink({
        period: selectedPlan.value as 'monthly' | 'yearly',
      })
      window.location.href = url
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

    isLikerPlus,
    isProcessingSubscription,

    checkLikerPlusStatus,
    startSubscription,
  }
}
