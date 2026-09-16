import type { SharedMemberEntry } from './use-plus-gift-session-api'
import { getSubscriptionPlanFromStatus } from '~~/shared/utils/subscription'

// Civic -> Plus tier change for the account page. Deliberately not routed through
// useSubscriptionCheckout: that path emits begin_checkout/subscribe, and logging a
// churn event as an acquisition would corrupt the ad-optimized conversion feed.
export function usePlusDowngrade() {
  const { t: $t } = useI18n()
  const accountStore = useAccountStore()
  const toast = useToast()
  const { handleError } = useErrorHandler()
  const plusSessionAPI = usePlusSessionAPI()
  const plusGiftSessionAPI = usePlusGiftSessionAPI()
  const { likerPlusPeriod } = useSubscription()

  const affectedMembers = ref<SharedMemberEntry[]>([])
  const isLoadingMembers = ref(false)
  const isDowngrading = ref(false)

  // Seats the switch will end. Refetched on open rather than read from the sibling
  // members card: this confirms an irreversible change, so the list it names has to
  // be current, not whatever the page loaded earlier. Only claimed seats lose access.
  async function loadAffectedMembers() {
    try {
      isLoadingMembers.value = true
      const { members } = await plusGiftSessionAPI.fetchSharedMembers()
      affectedMembers.value = (members || []).filter(member => member.status === 'claimed')
    }
    catch (error) {
      // The warning is a courtesy; a failed lookup must not block the switch.
      console.warn('Failed to fetch shared members before downgrade:', error)
      affectedMembers.value = []
    }
    finally {
      isLoadingMembers.value = false
    }
  }

  async function handleDowngrade() {
    if (isDowngrading.value) return false

    const period = getSubscriptionPlanFromStatus(likerPlusPeriod.value)
    if (!period) return false

    try {
      isDowngrading.value = true
      await plusSessionAPI.updateLikerPlusSubscription({ period, tier: 'plus' })
      useLogEvent('plus_downgrade_confirmed', {
        period,
        seats_affected: affectedMembers.value.length,
      })
      // Only likerPlus.pendingTier moves now — the tier itself flips when the
      // renewal invoice lands — so one refresh is enough; there is nothing to poll.
      await accountStore.refreshSessionInfo()
      toast.add({
        title: $t('plus_downgrade_success_toast_title'),
        description: $t('plus_downgrade_success_toast_description'),
        color: 'success',
      })
      return true
    }
    catch (error) {
      useLogEvent('plus_downgrade_error', { error_message: getErrorMessage(error) })
      await handleError(error, { title: $t('plus_downgrade_error') })
      return false
    }
    finally {
      isDowngrading.value = false
    }
  }

  return {
    affectedMembers,
    isLoadingMembers,
    isDowngrading,
    loadAffectedMembers,
    handleDowngrade,
  }
}
