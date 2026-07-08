// How the subscriber can manage their plan, by where they subscribed:
// - native-store: store-owned (App Store/Play) and in-app → native manage sheet
// - store-info:   store-owned but not in a build that can open the sheet (web,
//                 or an app build without IAP) → "manage on your device" text
// - stripe-portal: Stripe (incl. legacy/undefined provider, which predates IAP)
//                 on web → Stripe customer portal; hidden in-app for now
// - none:         not a subscriber, or Stripe in-app (no portal button in-app)
type LikerPlusManageMode = 'native-store' | 'store-info' | 'stripe-portal' | 'none'

// Liker Plus subscription-management state machine for the account page.
export function usePlusManagement() {
  const { t: $t } = useI18n()
  const { user } = useUserSession()
  const { isApp } = useAppDetection()
  const { isIAPSupported, manageSubscription: manageViaIAP } = useNativeIAP()
  const accountStore = useAccountStore()
  const localeRoute = useLocaleRoute()
  const { handleError } = useErrorHandler()
  const plusSessionAPI = usePlusSessionAPI()

  const isPaymentPastDue = computed(() =>
    !!user.value?.isExpiredLikerPlus && user.value?.likerPlusSubscriptionStatus === 'past_due',
  )

  const subscriptionStateLabel = computed(() => {
    if (!user.value) return undefined
    if (user.value.isLikerPlus) {
      // TODO: Support Trial
      return $t('account_page_subscription_plus')
    }
    if (user.value.isExpiredLikerPlus) {
      if (isPaymentPastDue.value) {
        return $t('account_page_subscription_past_due')
      }
      return $t('account_page_subscription_expired')
    }
    return $t('account_page_subscription_free')
  })

  const likerPlusButtonLabel = computed(() => {
    if (user.value?.isLikerPlus) return $t('account_page_manage_subscription')
    if (isPaymentPastDue.value) return $t('account_page_update_payment')
    return $t('account_page_renew_subscription')
  })

  const likerPlusManageMode = computed<LikerPlusManageMode>(() => {
    if (!user.value?.isLikerPlus && !user.value?.isExpiredLikerPlus) return 'none'
    if (user.value?.likerPlusProvider === 'revenuecat') {
      return isIAPSupported.value ? 'native-store' : 'store-info'
    }
    return isApp.value ? 'none' : 'stripe-portal'
  })

  const isOpeningBillingPortal = ref(false)
  const isManagingSubscription = ref(false)

  async function handleLikerPlusButtonClick() {
    useLogEvent('account_liker_plus_button_click')

    // A fully expired subscriber (neither active nor past_due) must re-subscribe,
    // not manage — on Play, showManageSubscriptions() errors when nothing is
    // active (surfaced as "開啟訂閱管理時發生錯誤"). past_due is excluded: it still
    // opens the store sheet / billing portal below to fix payment.
    if (!user.value?.isLikerPlus && !isPaymentPastDue.value) {
      await navigateTo(localeRoute({ name: 'member' }))
      return
    }

    // Store-owned subscription: open the native App Store / Play sheet. Only
    // refresh the session on success (a plan change reflects via webhook), and
    // surface failures the way the billing-portal path below does.
    if (likerPlusManageMode.value === 'native-store') {
      if (isManagingSubscription.value) return
      isManagingSubscription.value = true
      try {
        const result = await manageViaIAP()
        if (result.status === 'error') {
          // Use a recognized handler so only the localized copy shows, not the
          // raw native/English message (same pattern as restore purchases).
          await handleError(new Error('MANAGE_SUBSCRIPTION_FAILED'), {
            customHandlerMap: {
              MANAGE_SUBSCRIPTION_FAILED: { description: $t('error_manage_subscription_failed') },
            },
          })
          return
        }
        try {
          await accountStore.refreshSessionInfo()
        }
        catch (error) {
          // Best-effort sync after the native sheet closes; the management action
          // itself already succeeded, so a failed refresh is non-fatal (matches
          // the account page's other post-action refresh paths).
          console.error('Failed to refresh session info after managing subscription:', error)
        }
      }
      finally {
        isManagingSubscription.value = false
      }
      return
    }

    // Reaching here implies an active or past_due subscriber (the renew guard
    // above returns for everyone else), so this opens the Stripe billing portal.
    if (isOpeningBillingPortal.value) return
    try {
      isOpeningBillingPortal.value = true
      const { url } = await plusSessionAPI.fetchLikerPlusBillingPortalLink()
      // NOTE: Not using _blank here as some browsers block popups
      await navigateTo(url, { external: true })
    }
    catch (error) {
      isOpeningBillingPortal.value = false
      await handleError(error, {
        title: $t('error_billing_portal_failed'),
      })
    }
  }

  return {
    isPaymentPastDue,
    subscriptionStateLabel,
    likerPlusButtonLabel,
    likerPlusManageMode,
    isOpeningBillingPortal,
    isManagingSubscription,
    handleLikerPlusButtonClick,
    retryLikerPlusPayment: plusSessionAPI.retryLikerPlusPayment,
  }
}
