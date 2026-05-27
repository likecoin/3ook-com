import { createSharedComposable, useEventListener } from '@vueuse/core'

export type IAPPurchaseStatus = 'success' | 'cancelled' | 'error'

export interface IAPPurchaseResult {
  status: IAPPurchaseStatus
  period?: string
  isPlus?: boolean
  productId?: string
  message?: string
}

export interface IAPRestoreResult {
  status: 'success' | 'error'
  isPlus?: boolean
  message?: string
}

export interface IAPManageResult {
  status: 'success' | 'error'
  message?: string
}

export interface IAPOfferingPackage {
  period: string
  productId: string
  priceString: string
  price: number
  currency: string
}

// The StoreKit / Play purchase sheet stays open while the user authenticates,
// so allow plenty of time; the native side always replies (success / cancelled
// / error), making this only a lost-reply safety net.
const PURCHASE_TIMEOUT_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 20 * 1000

/**
 * Bridges Plus in-app purchases to the native RevenueCat layer when running
 * inside the native app. Web→native via `postToNative`; native→web replies
 * arrive as `nativeBridgeEvent` CustomEvents. Entitlement truth still comes
 * from the backend session — callers refresh the session after a success.
 *
 * Shared across all callers (checkout, pricing page, account) so a single
 * `nativeBridgeEvent` listener and one set of pending-request resolvers are
 * used; falls back to a fresh instance under SSR.
 */
export const useNativeIAP = createSharedComposable(() => {
  const { isApp } = useAppDetection()

  const isIAPSupported = computed(() => isApp.value && isNativeFeatureSupported('iap'))

  let pendingPurchase: ((r: IAPPurchaseResult) => void) | null = null
  let pendingRestore: ((r: IAPRestoreResult) => void) | null = null
  let pendingOfferings: ((p: IAPOfferingPackage[]) => void) | null = null
  let pendingManage: ((r: IAPManageResult) => void) | null = null
  // Dedupe concurrent getOfferings() calls by sharing the in-flight promise — a
  // second caller getting [] would read as "no offerings" and hide the pricing UI.
  let offeringsRequest: Promise<IAPOfferingPackage[]> | null = null

  // Consumers (checkout, pricing page, account) render during SSR where
  // `window` is undefined; only attach the reply listener on the client.
  if (import.meta.client) {
    useEventListener(window, 'nativeBridgeEvent', ((e: CustomEvent) => {
      const detail = e.detail
      if (!detail?.type) return
      switch (detail.type) {
        case 'iapPurchaseResult':
          pendingPurchase?.({
            status: detail.status,
            period: detail.period,
            isPlus: detail.isPlus,
            productId: detail.productId,
            message: detail.message,
          })
          pendingPurchase = null
          break
        case 'iapRestoreResult':
          pendingRestore?.({ status: detail.status, isPlus: detail.isPlus, message: detail.message })
          pendingRestore = null
          break
        case 'iapOfferings':
          pendingOfferings?.(Array.isArray(detail.packages) ? detail.packages : [])
          pendingOfferings = null
          break
        case 'iapManageResult':
          pendingManage?.({ status: detail.status, message: detail.message })
          pendingManage = null
          break
      }
    }) as EventListener)
  }

  // `likerId` is the backend internal user id — used as the RevenueCat
  // app_user_id the native side logs in with and the webhook resolves against.
  // Same field name as the `identifyUser` payload to avoid sending the wrong id.
  function purchase(period: SubscriptionPlan, likerId?: string): Promise<IAPPurchaseResult> {
    if (!isIAPSupported.value) {
      return Promise.resolve({ status: 'error', message: 'IAP not supported' })
    }
    // Without likerId the native side can't log RevenueCat in as the right
    // app_user_id; refuse rather than make an un-attributable purchase. Callers
    // gate this upstream — this is the bridge-boundary backstop.
    if (!likerId) {
      return Promise.resolve({ status: 'error', message: 'Missing likerId' })
    }
    if (pendingPurchase) {
      return Promise.resolve({ status: 'error', message: 'Purchase already in progress' })
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingPurchase = null
        resolve({ status: 'error', message: 'Purchase timed out' })
      }, PURCHASE_TIMEOUT_MS)
      pendingPurchase = (r) => {
        clearTimeout(timer)
        resolve(r)
      }
      postToNative({ type: 'iapPurchase', period, likerId })
    })
  }

  // `likerId` is required for the same reason as purchase(): the native side logs
  // in with it so a restored entitlement attributes to the right backend user.
  function restore(likerId?: string): Promise<IAPRestoreResult> {
    if (!isIAPSupported.value) {
      return Promise.resolve({ status: 'error', message: 'IAP not supported' })
    }
    // A restore without likerId attributes the entitlement to the wrong backend
    // user; refuse it (callers gate upstream).
    if (!likerId) {
      return Promise.resolve({ status: 'error', message: 'Missing likerId' })
    }
    if (pendingRestore) {
      return Promise.resolve({ status: 'error', message: 'Restore already in progress' })
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingRestore = null
        resolve({ status: 'error', message: 'Restore timed out' })
      }, PURCHASE_TIMEOUT_MS)
      pendingRestore = (r) => {
        clearTimeout(timer)
        resolve(r)
      }
      postToNative({ type: 'iapRestore', likerId })
    })
  }

  function getOfferings(): Promise<IAPOfferingPackage[]> {
    if (!isIAPSupported.value) return Promise.resolve([])
    if (offeringsRequest) return offeringsRequest
    offeringsRequest = new Promise<IAPOfferingPackage[]>((resolve) => {
      const timer = setTimeout(() => {
        pendingOfferings = null
        resolve([])
      }, REQUEST_TIMEOUT_MS)
      pendingOfferings = (p) => {
        clearTimeout(timer)
        resolve(p)
      }
      postToNative({ type: 'iapGetOfferings' })
    }).finally(() => { offeringsRequest = null })
    return offeringsRequest
  }

  // Opens the native App Store / Play subscription-management UI. Resolves when
  // the sheet is presented/dismissed — the store doesn't report what changed,
  // so callers refresh the session afterward to pick up any status change.
  function manageSubscription(): Promise<IAPManageResult> {
    if (!isIAPSupported.value) {
      return Promise.resolve({ status: 'error', message: 'IAP not supported' })
    }
    if (pendingManage) {
      return Promise.resolve({ status: 'error', message: 'Manage already in progress' })
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingManage = null
        resolve({ status: 'error', message: 'Manage timed out' })
      }, PURCHASE_TIMEOUT_MS)
      pendingManage = (r) => {
        clearTimeout(timer)
        resolve(r)
      }
      postToNative({ type: 'iapManageSubscription' })
    })
  }

  return { isIAPSupported, purchase, restore, getOfferings, manageSubscription }
})
