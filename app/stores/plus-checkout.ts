import type { FetchLikerPlusCheckoutLinkPayload } from '~/composables/use-plus-session-api'

export const usePlusCheckoutStore = defineStore('plus-checkout', () => {
  const clientSecret = ref<string | null>(null)
  const paymentId = ref<string | null>(null)
  const priceId = ref<string | null>(null)
  const period = ref<SubscriptionPlan | null>(null)
  const tier = ref<LikerPlusTier | null>(null)
  const coupon = ref<string | null>(null)
  const isTrial = ref(false)
  // The request that minted the embedded session, kept verbatim so a failed
  // render can replay it in hosted mode without re-deriving gift, trial or
  // attribution values the checkout page never saw.
  const checkoutPayload = ref<FetchLikerPlusCheckoutLinkPayload | null>(null)

  function setSession(payload: {
    clientSecret: string
    paymentId: string
    priceId?: string
    period: SubscriptionPlan
    tier?: LikerPlusTier
    coupon?: string | null
    isTrial: boolean
    checkoutPayload: FetchLikerPlusCheckoutLinkPayload
  }) {
    clientSecret.value = payload.clientSecret
    paymentId.value = payload.paymentId
    priceId.value = payload.priceId ?? null
    period.value = payload.period
    tier.value = payload.tier ?? null
    coupon.value = payload.coupon ?? null
    isTrial.value = payload.isTrial
    checkoutPayload.value = payload.checkoutPayload
  }

  function clear() {
    clientSecret.value = null
    paymentId.value = null
    priceId.value = null
    period.value = null
    tier.value = null
    coupon.value = null
    isTrial.value = false
    checkoutPayload.value = null
  }

  return {
    clientSecret,
    paymentId,
    priceId,
    period,
    tier,
    coupon,
    isTrial,
    checkoutPayload,
    setSession,
    clear,
  }
})
