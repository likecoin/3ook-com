import type { BookGiftInfo } from './use-book-purchase-session-api'
import type { FetchLikerPlusCheckoutLinkResponseData } from './use-plus-session-api'

export interface FetchLikerPlusGiftStatusResponseData {
  giftClassId?: string
  giftCartId?: string
  giftPaymentId?: string
  giftClaimToken?: string
}

export interface InviteSharedMemberResponseData {
  inviteId: string
  remainingSeats: number
}

export interface SharedMemberEntry {
  inviteId: string
  email: string
  name?: string
  status: 'pending' | 'claimed'
  timestamp?: number
  claimTimestamp?: number
}

export interface FetchSharedMembersResponseData {
  used: number
  total: number
  remaining: number
  members: SharedMemberEntry[]
}

export function usePlusGiftSessionAPI() {
  const { isApp } = useAppDetection()
  const { detectedCountry } = useDetectedGeolocation()
  const fetch = useLikeCoinSessionFetch()

  function fetchLikerPlusGiftCheckoutLink({
    period = 'yearly',
    quantity = 1,
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
    // Number of monthly gift units (i.e. gifted months, 1–11); only meaningful with period=monthly.
    quantity?: number
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
      query: {
        period,
        quantity,
        from,
        currency,
      },
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

  // Civic-tier benefit: invite a friend to one of the giver's revocable shared
  // member seats. The member's Plus access follows the giver's Civic lifecycle.
  function inviteSharedMember({ email, name, message }: {
    email: string
    name?: string
    message?: string
  }) {
    return fetch.value<InviteSharedMemberResponseData>(`/plus/shared/members`, {
      method: 'POST',
      body: { email, name, message },
    })
  }

  function fetchSharedMembers() {
    return fetch.value<FetchSharedMembersResponseData>(`/plus/shared/members`)
  }

  // All three are required: the API addresses the invite doc under the giver's
  // user record, so a link without `giver` is rejected as invalid input.
  function claimSharedMemberInvite({ giverLikerId, inviteId, token }: {
    giverLikerId: string
    inviteId: string
    token: string
  }) {
    return fetch.value(`/plus/shared/members/claim`, {
      method: 'POST',
      body: { giverLikerId, inviteId, token },
    })
  }

  function revokeSharedMember(inviteId: string) {
    return fetch.value(`/plus/shared/members/${inviteId}`, {
      method: 'DELETE',
    })
  }

  function fetchPlusGiftCartStatusById({ cartId, token }: { cartId: string, token: string }) {
    return fetch.value<{
      giftInfo?: BookGiftInfo
      period?: string
      quantity?: number
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
    inviteSharedMember,
    fetchSharedMembers,
    claimSharedMemberInvite,
    revokeSharedMember,
    fetchPlusGiftCartStatusById,
    claimPlusGiftCart,
  }
}
