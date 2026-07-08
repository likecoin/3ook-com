import type { FetchStripeConnectStatusResponseData } from '~/composables/use-stripe-connect-session-api'

type StripeConnectState = 'ready' | 'pending' | 'none'

// Stripe Connect onboarding/manage state machine for the account page.
export function useStripeConnectManagement() {
  const { t: $t } = useI18n()
  const { user } = useUserSession()
  const { isApp } = useAppDetection()
  const { handleError } = useErrorHandler()
  const stripeConnectSessionAPI = useStripeConnectSessionAPI()

  // useState so every caller (account page watcher, creator card) shares
  // one status; the page loads it on login/return and the card renders it.
  const stripeConnectStatus = useState<FetchStripeConnectStatusResponseData>('stripe-connect-status', () => ({
    hasAccount: false,
    isReady: false,
  }))
  const isStripeConnectLoading = useState('stripe-connect-loading', () => false)

  const stripeConnectState = computed<StripeConnectState>(() => {
    if (stripeConnectStatus.value.isReady) return 'ready'
    if (stripeConnectStatus.value.hasAccount) return 'pending'
    return 'none'
  })

  const stripeConnectStatusLabel = computed(() => {
    switch (stripeConnectState.value) {
      case 'ready':
        return $t('account_page_stripe_connect_status_ready')
      case 'pending':
        return $t('account_page_stripe_connect_status_pending')
      case 'none':
        return $t('account_page_stripe_connect_status_none')
    }
    return ''
  })

  const stripeConnectButtonLabel = computed(() => {
    switch (stripeConnectState.value) {
      case 'ready':
        return $t('account_page_stripe_connect_manage_button')
      case 'pending':
        return $t('account_page_stripe_connect_resume_button')
      case 'none':
        return $t('account_page_stripe_connect_setup_button')
    }
    return ''
  })

  function resetStripeConnectState() {
    stripeConnectStatus.value = {
      hasAccount: false,
      isReady: false,
    }
    isStripeConnectLoading.value = false
  }

  // The status is shared state, so only one live instance should own the
  // wallet-change reset; the flag hands ownership to the next instance when
  // the current owner's scope is disposed.
  const hasWalletWatcher = useState('stripe-connect-wallet-watcher', () => false)
  if (!hasWalletWatcher.value) {
    hasWalletWatcher.value = true
    watch(() => user.value?.evmWallet, () => {
      resetStripeConnectState()
    })
    onScopeDispose(() => {
      hasWalletWatcher.value = false
    })
  }

  async function loadStripeConnectStatus() {
    if (isApp.value) return
    if (!user.value?.evmWallet) return
    try {
      stripeConnectStatus.value = await stripeConnectSessionAPI.fetchStripeConnectStatus({
        wallet: user.value.evmWallet,
      })
    }
    catch (error) {
      console.error('Failed to fetch Stripe Connect status:', error)
    }
  }

  async function refreshStripeConnectStatus() {
    if (isApp.value) return
    try {
      await stripeConnectSessionAPI.refreshStripeConnectStatus()
    }
    catch (error) {
      console.error('Failed to refresh Stripe Connect status:', error)
    }
    await loadStripeConnectStatus()
  }

  async function handleStripeConnectButtonClick() {
    if (isStripeConnectLoading.value) return
    const isManage = stripeConnectState.value === 'ready'
    isStripeConnectLoading.value = true
    try {
      useLogEvent(isManage ? 'stripe_connect_login' : 'stripe_connect_setup_started')
      const { url } = isManage
        ? await stripeConnectSessionAPI.fetchStripeConnectLoginLink()
        : await stripeConnectSessionAPI.createStripeConnectAccount()
      await navigateTo(url, { external: true })
    }
    catch (error) {
      isStripeConnectLoading.value = false
      await handleError(error, {
        title: isManage
          ? $t('account_page_stripe_connect_manage_failed')
          : $t('account_page_stripe_connect_setup_failed'),
      })
    }
  }

  return {
    stripeConnectStatus,
    isStripeConnectLoading,
    stripeConnectStatusLabel,
    stripeConnectButtonLabel,
    loadStripeConnectStatus,
    refreshStripeConnectStatus,
    handleStripeConnectButtonClick,
  }
}
