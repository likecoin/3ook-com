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
  // Store intro offer (App Store Connect / Play + RevenueCat), absent when the
  // product has no intro offer. `trialPeriodDays` is the intro length in days;
  // `isFreeTrial` distinguishes a free trial from a paid intro; `introPriceString`
  // is the store-formatted price to display verbatim for a paid intro.
  trialPeriodDays?: number
  isFreeTrial?: boolean
  introPrice?: number
  introPriceString?: string
}

// Trial info resolved for a plan, shaped for the Plus UI props. `isPaidTrial`
// is explicit (not re-derived from the day count) because store free trials can
// be >= the web's paid-trial day threshold and would otherwise be misrendered.
export interface IAPTrialInfo {
  trialPeriodDays: number
  isPaidTrial: boolean
  trialPriceString?: string
}

// `priceString` is the localized verbatim string ("HK$88") so the shown price
// equals what the store will charge; numeric `price` is surfaced for math that
// must match the store's real numbers (e.g. yearly-vs-monthly discount percent).
export interface IAPPlanPrice {
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
 * arrive as `nativeBridgeEvent` CustomEvents. The backend session stays the
 * canonical entitlement source (callers refresh it after a success); a
 * device-confirmed purchase is recorded only to optimistically unblock
 * client-side gates while the webhook flips the canonical flag.
 *
 * Shared across all callers (checkout, pricing page, account) so a single
 * `nativeBridgeEvent` listener and one set of pending-request resolvers are
 * used; falls back to a fresh instance under SSR.
 */
export const useNativeIAP = createSharedComposable(() => {
  const { isApp } = useAppDetection()
  const { markDevicePlusEntitled } = useDevicePlusEntitlement()

  const isIAPSupported = computed(() => isApp.value && isNativeFeatureSupported('iap'))

  // Inverse of the "no checkout in-app" anti-steering gate: true when the user
  // can complete a purchase from the current surface (web Stripe or in-app IAP).
  const canStartSubscribeFlow = computed(() => !isApp.value || isIAPSupported.value)

  let pendingPurchase: ((r: IAPPurchaseResult) => void) | null = null
  let pendingRestore: ((r: IAPRestoreResult) => void) | null = null
  let pendingOfferings: ((p: IAPOfferingPackage[]) => void) | null = null
  let pendingManage: ((r: IAPManageResult) => void) | null = null
  // Dedupe concurrent getOfferings() calls by sharing the in-flight promise — a
  // second caller getting [] would read as "no offerings" and hide the pricing UI.
  let offeringsRequest: Promise<IAPOfferingPackage[]> | null = null

  // Reactive cache driving trial/price display; empty until ensureOfferings()
  // resolves, which renders as "no trial". `offeringsLoaded` distinguishes
  // "not fetched yet" from a fetched empty result (no intro offer configured).
  const offerings = ref<IAPOfferingPackage[]>([])
  let offeringsLoaded = false

  // Consumers (checkout, pricing page, account) render during SSR where
  // `window` is undefined; only attach the reply listener on the client.
  if (import.meta.client) {
    useEventListener(window, 'nativeBridgeEvent', ((e: CustomEvent) => {
      const detail = e.detail
      if (!detail?.type) return
      switch (detail.type) {
        case 'iapPurchaseResult':
          // The device store confirms entitlement instantly; record it so the
          // paywall/TTS gates unblock without waiting out the backend webhook.
          if (isIAPSupported.value && detail.status === 'success' && detail.isPlus) markDevicePlusEntitled()
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
          if (isIAPSupported.value && detail.status === 'success' && detail.isPlus) markDevicePlusEntitled()
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
  // `attributes` are custom RevenueCat subscriber attributes (gift book, affiliate
  // channel, ad-attribution ids) the native side sets before purchase so they reach
  // the webhook's subscriber_attributes — the IAP equivalent of Stripe checkout
  // metadata. The native handler ignores reserved ($-prefixed) keys.
  function purchase(
    period: SubscriptionPlan,
    likerId?: string,
    attributes?: Record<string, string>,
  ): Promise<IAPPurchaseResult> {
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
      postToNative({ type: 'iapPurchase', period, likerId, attributes })
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

  // Fetches the offerings at most once per session and caches them reactively.
  // Safe to call from multiple consumers (paywall/upsell modals) on mount;
  // concurrent calls share one round-trip via getOfferings()'s offeringsRequest.
  // Offers are static store config, so a fetched empty result latches too — a
  // transient failure just means no trial copy until the next launch (display only).
  async function ensureOfferings(): Promise<IAPOfferingPackage[]> {
    if (!isIAPSupported.value) return []
    if (offeringsLoaded) return offerings.value
    offerings.value = await getOfferings()
    offeringsLoaded = true
    return offerings.value
  }

  function findOffering(period: SubscriptionPlan): IAPOfferingPackage | undefined {
    return offerings.value.find(p => p.period === period)
  }

  // Returns undefined until offerings load (or when the store has no package for
  // the period) so callers fall back to the Stripe-configured display.
  function getIAPPlanPrice(period: SubscriptionPlan): IAPPlanPrice | undefined {
    const pkg = findOffering(period)
    if (!pkg?.priceString) return undefined
    return { priceString: pkg.priceString, price: pkg.price, currency: pkg.currency }
  }

  // Defaults to no trial when there's no offer or offerings haven't loaded yet.
  function getIAPTrial(period: SubscriptionPlan): IAPTrialInfo {
    const pkg = findOffering(period)
    const trialPeriodDays = pkg?.trialPeriodDays ?? 0
    const isPaidTrial = trialPeriodDays > 0 && pkg?.isFreeTrial === false
    // A paid intro is only honest to display with the store's formatted price;
    // without it the UI would fall back to the Stripe-configured price and risk a
    // mismatch, so suppress the trial rather than show a wrong price.
    if (isPaidTrial && !pkg?.introPriceString) {
      return { trialPeriodDays: 0, isPaidTrial: false }
    }
    return {
      trialPeriodDays,
      isPaidTrial,
      trialPriceString: isPaidTrial ? pkg?.introPriceString : undefined,
    }
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

  return { isIAPSupported, canStartSubscribeFlow, purchase, restore, getOfferings, ensureOfferings, getIAPTrial, getIAPPlanPrice, manageSubscription }
})
