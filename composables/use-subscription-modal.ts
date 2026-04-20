import type { RouteLocationAsRelativeGeneric } from 'vue-router'
import { PaywallModal, UpsellPlusModal } from '#components'
import type { PaywallModalProps } from '~/components/PaywallModal.props'
import type { UpsellPlusModalProps } from '~/components/UpsellPlusModal.props'
import { DEFAULT_TRIAL_PERIOD_DAYS } from '~/constants/pricing'

type OpenPaywallModalOptions = PaywallModalProps & {
  redirectRoute?: RouteLocationAsRelativeGeneric
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

  const selectedPlan = ref<SubscriptionPlan>('yearly')

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
      'trialPeriodDays': DEFAULT_TRIAL_PERIOD_DAYS,
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
      onSubscribe: startSubscription,
      onClose: () => {
        useLogEvent('subscription_button_click_skip')
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

  const route = useRoute()
  watch(() => [route.name, route.params], () => {
    if (paywallModal.isOpen) paywallModal.close()
    if (upsellPlusModal.isOpen) upsellPlusModal.close()
  })

  async function openPaywallModal(options: OpenPaywallModalOptions = {}) {
    if (paywallModal.isOpen) {
      paywallModal.close()
    }

    const { redirectRoute, ...modalProps } = options
    const baseProps = getPaywallModalProps()
    paywallModalProps.value = {
      ...baseProps,
      ...modalProps,
      onSubscribe: (payload) => {
        paywallModal.close()
        startSubscription({ ...payload, redirectRoute })
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
      const upsellModalProps: UpsellPlusModalProps = {
        ...props,
        ...getUpsellPlusModalProps(),
        nftClassId,
      }
      if (props.nftClassId) {
        shownUpsellClassIds.value = [...shownUpsellClassIds.value, props.nftClassId]
      }
      else {
        hasShownGenericUpsell.value = true
      }
      useLogEvent('upsell_plus_modal_open')
      return upsellPlusModal.open(upsellModalProps).result
    }
  }

  watch(isProcessingSubscription, (newValue) => {
    paywallModal.patch({
      ...paywallModalProps.value,
      isProcessingSubscription: newValue,
    })
  })

  return {
    ...subscriptionData,
    ...checkoutData,

    openPaywallModal,
    closePaywallModal,
    openUpsellPlusModalIfEligible,
  }
}
