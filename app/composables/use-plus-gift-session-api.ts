import type { BookGiftInfo } from './use-book-purchase-session-api'
import type { FetchLikerPlusCheckoutLinkResponseData } from './use-plus-session-api'

export interface FetchLikerPlusGiftStatusResponseData {
  giftClassId?: string
  giftCartId?: string
  giftPaymentId?: string
  giftClaimToken?: string
}

export function usePlusGiftSessionAPI() {
  const { isApp } = useAppDetection()
  const { detectedCountry } = useDetectedGeolocation()
  const fetch = useLikeCoinSessionFetch()

  function fetchLikerPlusGiftCheckoutLink({
    period = 'yearly',
    giftInfo,
    coupon,
    from,
    currency,
    referrer,
    utmCampaign,
    utmMedium,
    utmSource,
    utmContent,
    utmTerm,
    gaClientId,
    gaSessionId,
    gadClickId,
    gadSource,
    fbClickId,
    fbp,
    fbc,
    posthogDistinctId,
  }: {
    period?: SubscriptionPlan
    giftInfo: BookGiftInfo
    coupon?: string
    from?: string
    currency?: string
    referrer?: string
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    utmContent?: string
    utmTerm?: string
    gaClientId?: string
    gaSessionId?: string
    gadClickId?: string
    gadSource?: string
    fbClickId?: string
    fbp?: string
    fbc?: string
    posthogDistinctId?: string
  }) {
    return fetch.value<FetchLikerPlusCheckoutLinkResponseData>(`/plus/gift/new`, {
      method: 'POST',
      query: { period, from, currency },
      body: {
        giftInfo,
        referrer,
        utmCampaign,
        utmMedium,
        utmSource,
        utmContent,
        utmTerm,
        gaClientId,
        gaSessionId,
        gadClickId,
        gadSource,
        fbClickId,
        fbp,
        fbc,
        posthogDistinctId,
        coupon,
        ipCountry: detectedCountry.value || undefined,
        isApp: isApp.value || undefined,
      },
    })
  }

  function fetchLikerPlusGiftStatus() {
    return fetch.value<FetchLikerPlusGiftStatusResponseData>(`/plus/gift`)
  }

  function fetchPlusGiftCartStatusById({ cartId, token }: { cartId: string, token: string }) {
    return fetch.value<{
      giftInfo?: BookGiftInfo
      period?: string
    }>(`/plus/gift/${cartId}/status`, {
      query: { token },
    })
  }

  function claimPlusGiftCart({ cartId, token }: { cartId: string, token: string }) {
    return fetch.value(`/plus/gift/${cartId}/claim`, {
      method: 'POST',
      query: { token },
    })
  }

  return {
    fetchLikerPlusGiftCheckoutLink,
    fetchLikerPlusGiftStatus,
    fetchPlusGiftCartStatusById,
    claimPlusGiftCart,
  }
}
