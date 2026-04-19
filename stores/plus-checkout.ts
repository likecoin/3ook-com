export const usePlusCheckoutStore = defineStore('plus-checkout', () => {
  const clientSecret = ref<string | null>(null)
  const paymentId = ref<string | null>(null)
  const period = ref<SubscriptionPlan | null>(null)
  const coupon = ref<string | null>(null)

  function setSession(payload: {
    clientSecret: string
    paymentId: string
    period: SubscriptionPlan
    coupon?: string | null
  }) {
    clientSecret.value = payload.clientSecret
    paymentId.value = payload.paymentId
    period.value = payload.period
    coupon.value = payload.coupon ?? null
  }

  function clear() {
    clientSecret.value = null
    paymentId.value = null
    period.value = null
    coupon.value = null
  }

  return {
    clientSecret,
    paymentId,
    period,
    coupon,
    setSession,
    clear,
  }
})
