import type { RouteLocationAsRelativeGeneric } from 'vue-router'
import { PaywallModal, UpsellPlusModal } from '#components'
import type { PaywallModalProps } from '~/components/PaywallModal.props'
import type { UpsellPlusModalProps } from '~/components/UpsellPlusModal.props'
import type { PlusCheckoutPlacement } from '~~/shared/constants/analytics'

type OpenPaywallModalOptions = PaywallModalProps & {
  redirectRoute?: RouteLocationAsRelativeGeneric
  checkoutPlacement?: PlusCheckoutPlacement
}

export function useSubscriptionModal() {
  const subscriptionData = useSubscription()
  const {
    yearlyPrice,
    monthlyPrice,
    currency,
    isLikerPlus,
    likerPlusPeriod,
  } = subscriptionData

  const checkoutData = useSubscriptionCheckout()
  const { startSubscription, isProcessingSubscription } = checkoutData
  const { isIAPSupported, ensureOfferings, getIAPTrial } = useNativeIAP()
  const { iapMonthlyPrice, iapYearlyPrice, getIAPOverrides } = useIAPPricingOverrides()

  const selectedPlan = ref<SubscriptionPlan>('yearly')

  // iapTrial is reactive on selectedPlan + offerings so the post-mount paywall
  // patch watch fires when either changes; getIAPOverrides re-reads via the
  // helper inside the callback.
  const iapTrial = computed(() => getIAPTrial(selectedPlan.value))

  const paywallModalProps = ref<PaywallModalProps>({})

  const eventPayload = computed(() => ({
    currency: currency.value,
    value: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
    items: [{
      id: `plus-${selectedPlan.value}`,
      name: `Plus (${selectedPlan.value})`,
      price: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
      currency: currency.value,
      quantity: 1,
    }],
  }))

  function getPaywallModalProps(): PaywallModalProps {
    return {
      ...getIAPOverrides(selectedPlan.value),
      'modelValue': selectedPlan.value,
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
      isLikerPlus: isLikerPlus.value,
      likerPlusPeriod: likerPlusPeriod.value,
      onSubscribe: payload => startSubscription({ ...payload, checkoutPlacement: 'book-upsell-modal' }),
      ...getIAPOverrides('yearly'),
    }
  }

  const overlay = useOverlay()
  const paywallModal = overlay.create(PaywallModal, {
    props: getPaywallModalProps(),
  })
  const upsellPlusModal = overlay.create(UpsellPlusModal, {
    props: getUpsellPlusModalProps(),
  })

  // Close on committed navigation via router.afterEach rather than
  // watch(() => route.path): callers such as the reader page unmount when
  // checkout navigates (embedded plus-checkout, IAP plus-success). A route-path
  // watcher's async-flushed callback can be torn down with the page before it
  // runs, leaking the app-root overlay onto the next page; afterEach fires
  // synchronously during navigation, before unmount. Guard on path so in-place
  // query updates (e.g. UTM persistence) don't dismiss the modal.
  const router = useRouter()
  const stopCloseOnNavigate = router.afterEach((to, from) => {
    if (to.path === from.path) return
    paywallModal.close()
    upsellPlusModal.close()
  })
  onScopeDispose(stopCloseOnNavigate)

  async function openPaywallModal(options: OpenPaywallModalOptions = {}) {
    if (paywallModal.isOpen) {
      paywallModal.close()
    }

    const { redirectRoute, checkoutPlacement, ...modalProps } = options
    const baseProps = getPaywallModalProps()
    paywallModalProps.value = {
      ...baseProps,
      ...modalProps,
      onSubscribe: (payload) => {
        // Keep the paywall open while checkout starts so the user is never dropped
        // back to the book: the native IAP sheet takes a moment to appear, and the
        // Stripe flow either navigates away (closing the tab's page) or, on error,
        // leaves the paywall in place to retry. A successful in-app/embedded flow
        // changes the route, which closes the modal via router.afterEach below.
        startSubscription({ ...payload, redirectRoute, checkoutPlacement })
      },
    }
    return paywallModal.open(paywallModalProps.value).result
  }

  function closePaywallModal() {
    paywallModal.close()
  }

  const shownUpsellClassIds = useSessionStorage<string[]>('3ook_upsell_plus_shown_ids', [])
  const hasShownGenericUpsell = useSessionStorage('3ook_upsell_plus_shown', false)

  async function openUpsellPlusModalIfEligible(props: UpsellPlusModalProps = {}) {
    // Per-book dedup: allow showing upsell for different books in the same session
    // For non-book contexts (no nftClassId), fall back to once-per-session
    if (props.nftClassId) {
      if (shownUpsellClassIds.value.includes(props.nftClassId)) return
    }
    else if (hasShownGenericUpsell.value) {
      return
    }
    if (upsellPlusModal.isOpen) {
      upsellPlusModal.close()
    }
    let nftClassId = props.nftClassId
    if (!props.bookPrice || props.bookPrice > yearlyPrice.value) {
      nftClassId = undefined
    }
    if (!isLikerPlus.value && (!props.from || nftClassId)) {
      const upsellEventPayload = {
        nft_class_id: nftClassId,
        source_nft_class_id: props.nftClassId,
        book_price: props.bookPrice,
        from: props.from,
        selected_pricing_item_index: props.selectedPricingItemIndex,
      }
      // The upsell reads the store offer synchronously and, unlike the paywall
      // modal, isn't patched after offerings resolve — so load them before
      // building props or it renders with no trial. Cached/deduped; no-op on web.
      await ensureOfferings()
      const upsellModalProps: UpsellPlusModalProps = {
        ...props,
        ...getUpsellPlusModalProps(),
        nftClassId,
        onClose: (isSuccess: boolean) => {
          if (!isSuccess) {
            useLogEvent('subscription_button_click_skip', upsellEventPayload)
          }
          props.onClose?.(isSuccess)
        },
      }
      if (props.nftClassId) {
        shownUpsellClassIds.value = [...shownUpsellClassIds.value, props.nftClassId]
      }
      else {
        hasShownGenericUpsell.value = true
      }
      useLogEvent('upsell_plus_modal_open', upsellEventPayload)
      return upsellPlusModal.open(upsellModalProps).result
    }
  }

  watch(isProcessingSubscription, (newValue) => {
    paywallModal.patch({
      ...paywallModalProps.value,
      isProcessingSubscription: newValue,
    })
  })

  // Keep the open paywall modal's trial and recurring price accurate when the
  // store offer resolves (offerings load after mount) or the selected plan
  // changes. Harmless when the modal is closed (mirrors the
  // isProcessingSubscription patch above).
  watch([iapTrial, iapMonthlyPrice, iapYearlyPrice], () => {
    if (!isIAPSupported.value) return
    paywallModalProps.value = {
      ...paywallModalProps.value,
      ...getIAPOverrides(selectedPlan.value),
    }
    paywallModal.patch(paywallModalProps.value)
  })

  return {
    ...subscriptionData,
    ...checkoutData,

    openPaywallModal,
    closePaywallModal,
    openUpsellPlusModalIfEligible,
  }
}
