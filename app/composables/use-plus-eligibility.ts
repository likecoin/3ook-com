// Plus plan billability + what can be done on this surface.
// Modes: native-store (actionable here), store-info (manage on device), stripe-portal (web), none.
export type LikerPlusManageMode = 'native-store' | 'store-info' | 'stripe-portal' | 'none'

// Read-only eligibility, split from usePlusManagement so pricing and checkout
// surfaces can ask "can they buy this here?" without constructing the account
// page's billing-portal machinery.
export function usePlusEligibility() {
  const { user } = useUserSession()
  const { isApp, isIOS, isAndroid } = useAppDetection()
  const { isIAPSupported, isCivicIAPSupported, canStartCivicSubscribeFlow } = useNativeIAP()
  const { isCivicMember, isLikerPlus } = useSubscription()

  // Both the manage sheet and an IAP act on the store account signed in on this
  // device. An unknown store stays permissive: records predate the field, and
  // refusing them would break same-store flows that work today.
  const isSubscriptionStoreOnThisDevice = computed(() => {
    const store = user.value?.likerPlusStore
    if (store === 'app_store' && !isIOS.value) return false
    if (store === 'play_store' && !isAndroid.value) return false
    return true
  })

  const likerPlusManageMode = computed<LikerPlusManageMode>(() => {
    if (!user.value?.isLikerPlus && !user.value?.isExpiredLikerPlus) return 'none'
    // Seat-granted members have no billing of their own: the membership
    // follows the giver's Civic subscription, so there is nothing to manage.
    if (user.value?.likerPlusProvider === 'shared') return 'none'
    if (user.value?.likerPlusProvider === 'revenuecat') {
      return isIAPSupported.value && isSubscriptionStoreOnThisDevice.value
        ? 'native-store'
        : 'store-info'
    }
    return isApp.value ? 'none' : 'stripe-portal'
  })

  // An in-place tier upgrade bills through whatever already owns the plan, so it
  // is possible exactly where the plan is actionable — plus, on a store, a shell
  // whose catalogue carries Civic. Trials and seat-granted members would 400.
  const canUpgradeToCivic = computed(() => {
    if (!user.value?.isLikerPlus || isCivicMember.value || user.value.isLikerPlusTrial) {
      return false
    }
    if (likerPlusManageMode.value === 'native-store') return isCivicIAPSupported.value
    return likerPlusManageMode.value === 'stripe-portal'
  })

  // Whether Civic is worth pitching to this viewer at all.
  const isCivicOfferable = computed(() => {
    if (isCivicMember.value) return false
    if (isLikerPlus.value) return canUpgradeToCivic.value
    return canStartCivicSubscribeFlow.value
  })

  return { likerPlusManageMode, canUpgradeToCivic, isCivicOfferable }
}
