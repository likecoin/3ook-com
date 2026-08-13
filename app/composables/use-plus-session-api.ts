export type CheckoutUIMode = 'hosted' | 'embedded'

export interface FetchLikerPlusCheckoutLinkResponseData {
  sessionId: string
  paymentId: string
  url?: string
  clientSecret?: string
}

export interface FetchLikerPlusBillingPortalLinkResponseData {
  sessionId: string
  url: string
}

export function usePlusSessionAPI() {
  const { isApp } = useAppDetection()
  const { detectedCountry } = useDetectedGeolocation()
  const fetch = useLikeCoinSessionFetch()

  function fetchLikerPlusCheckoutLink({
    period = 'monthly',
    tier = 'plus',
    trialPeriodDays,
    mustCollectPaymentMethod,
    giftNFTClassId,
    from,
    currency,
    referrer,
    utmCampaign,
    utmMedium,
    utmSource,
    utmContent,
    utmTerm,
    initialUtmCampaign,
    initialUtmMedium,
    initialUtmSource,
    gaClientId,
    gaSessionId,
    gadClickId,
    gadSource,
    fbClickId,
    fbp,
    fbc,
    posthogDistinctId,
    coupon,
    uiMode,
  }: {
    period?: SubscriptionPlan
    tier?: LikerPlusTier
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    giftNFTClassId?: string
    from?: string
    currency?: string
    referrer?: string
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    utmContent?: string
    utmTerm?: string
    initialUtmCampaign?: string
    initialUtmMedium?: string
    initialUtmSource?: string
    gaClientId?: string
    gaSessionId?: string
    gadClickId?: string
    gadSource?: string
    fbClickId?: string
    fbp?: string
    fbc?: string
    posthogDistinctId?: string
    coupon?: string
    uiMode?: CheckoutUIMode
  }) {
    return fetch.value<FetchLikerPlusCheckoutLinkResponseData>(`/plus/new`, {
      method: 'POST',
      query: { period, tier, from, currency },
      body: {
        trialPeriodDays,
        mustCollectPaymentMethod,
        giftClassId: giftNFTClassId,
        referrer,
        utmCampaign,
        utmMedium,
        utmSource,
        utmContent,
        utmTerm,
        initialUtmCampaign,
        initialUtmMedium,
        initialUtmSource,
        gaClientId,
        gaSessionId,
        gadClickId,
        gadSource,
        fbClickId,
        fbp,
        fbc,
        posthogDistinctId,
        coupon,
        uiMode,
        ipCountry: detectedCountry.value || undefined,
        isApp: isApp.value || undefined,
      },
    })
  }

  function updateLikerPlusSubscription({
    period,
    tier,
    giftNFTClassId,
    giftPriceIndex,
  }: {
    period: SubscriptionPlan
    // Target tier for Plus<->Civic switches; omitted keeps the current tier.
    tier?: LikerPlusTier
    giftNFTClassId?: string
    giftPriceIndex?: number
  }) {
    return fetch.value(`/plus/price`, {
      method: 'POST',
      body: {
        period,
        tier,
        giftClassId: giftNFTClassId,
        giftPriceIndex,
      },
    })
  }

  function fetchLikerPlusBillingPortalLink() {
    return fetch.value<FetchLikerPlusBillingPortalLinkResponseData>(`/plus/portal`, { method: 'POST' })
  }

  function retryLikerPlusPayment() {
    return fetch.value(`/plus/retry`, { method: 'POST' })
  }

  return {
    fetchLikerPlusCheckoutLink,
    updateLikerPlusSubscription,
    fetchLikerPlusBillingPortalLink,
    retryLikerPlusPayment,
  }
}
