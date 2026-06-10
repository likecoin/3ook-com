import { createSharedComposable } from '@vueuse/core'

// Optimistic Plus entitlement reported by the device store (StoreKit / Play via
// RevenueCat) the instant a purchase/restore succeeds, bridging the gap until the
// webhook flips the canonical `isLikerPlus`. In-memory only so it can't outlive
// the session and grant access after expiry — the backend session stays canonical.
const RECONCILE_MAX_ATTEMPTS = 15
const RECONCILE_DELAY_MS = 3000

// Shared across all consumers (TTS gates, native IAP) so the account-switch watcher
// and `isPlusOrDevicePlus` computed are instantiated once; state is `useState`-backed
// so it stays correct even if SSR falls back to a fresh instance per request.
export const useDevicePlusEntitlement = createSharedComposable(() => {
  const { user, loggedIn } = useUserSession()
  const accountStore = useAccountStore()

  const hasDevicePlus = useState('device-plus-entitlement', () => false)
  // Guards the reconcile loop so repeated marks don't stack refresh polls.
  const isReconciling = useState('device-plus-reconciling', () => false)

  // Effective Plus for client-side gates: canonical session flag OR the device
  // store's confirmed-but-not-yet-reconciled purchase (scoped to this session).
  const isPlusOrDevicePlus = computed(() => !!user.value?.isLikerPlus || (loggedIn.value && hasDevicePlus.value))

  // Drop the optimistic flag on logout or account switch so a purchase in one
  // account can't suppress paywalls for the next user in the same tab.
  watch(() => user.value?.likerId, (newId, oldId) => {
    if (!newId || (oldId && oldId !== newId)) hasDevicePlus.value = false
  })

  // Refresh the session until the canonical flag catches up with the device, so
  // the server TTS gate opens on its own. Bounded; bails if the user logs out.
  async function reconcileSessionUntilPlus(): Promise<void> {
    if (isReconciling.value) return
    isReconciling.value = true
    try {
      for (let attempt = 0; attempt < RECONCILE_MAX_ATTEMPTS; attempt++) {
        if (!user.value || user.value.isLikerPlus) return
        try {
          await accountStore.refreshSessionInfo()
        }
        catch {
          // best-effort; retry on the next tick
        }
        if (user.value?.isLikerPlus) return
        if (attempt < RECONCILE_MAX_ATTEMPTS - 1) await sleep(RECONCILE_DELAY_MS)
      }
    }
    finally {
      isReconciling.value = false
    }
  }

  // Called when the device store confirms entitlement (purchase/restore). Flips
  // the optimistic flag and kicks the background reconcile so the canonical flag
  // follows without user action.
  function markDevicePlusEntitled() {
    // A purchase/restore reply can land after logout; recording it then would
    // leak the optimistic flag into the next login in the same tab.
    if (!loggedIn.value) return
    if (!hasDevicePlus.value) hasDevicePlus.value = true
    if (import.meta.client && !user.value?.isLikerPlus) {
      void reconcileSessionUntilPlus()
    }
  }

  return { hasDevicePlus, isPlusOrDevicePlus, markDevicePlusEntitled }
})
