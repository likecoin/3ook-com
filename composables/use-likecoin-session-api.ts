import type { FetchOptions } from 'ofetch'

export interface FetchCartStatusByIdResponseData {
  email: string
  status: 'paid' | 'pendingClaim' | 'pending' | 'pendingNFT' | 'completed' | 'done'
  sessionId: string
  isPaid: boolean
  isPendingClaim: boolean
  priceInDecimal: number
  price: number
  originalPriceInDecimal: number
  from: string
  timestamp: number
  quantity: number
  classIds: string[]
  classIdsWithPrice: {
    classId: string
    priceIndex: number
    quantity: number
    price: number
    priceInDecimal: number
    originalPriceInDecimal: number
  }[]
}

export interface ClaimCartByIdResponseData {
  classIds: string[]
  newClaimedNFTs: {
    classId: string
    nftId: string
  }[]
  allItemsAutoClaimed: boolean
  errors?: { error: string }[]
}

export interface FetchLikerPlusCheckoutLinkResponseData {
  sessionId: string
  url: string
}

export interface FetchLikerPlusBillingPortalLinkResponseData {
  sessionId: string
  url: string
}

export interface FetchLikerPlusGiftStatusResponseData {
  giftClassId?: string
  giftCartId?: string
  giftPaymentId?: string
  giftClaimToken?: string
}

export interface MigrateMagicEmailUserResponseData {
  isMigratedBookUser: boolean
  isMigratedBookOwner: boolean
  isMigratedLikerId: boolean
  isMigratedLikerLand: boolean
}

export type FetchFreeClaimableBooksResponseData = string[]

export interface ClaimFreeBookResponseData {
  paymentId: string
  classIds: string
  cartId: string
  claimToken: string
}

export function useLikeCoinSessionAPI() {
  const config = useRuntimeConfig()
  const { loggedIn: hasLoggedIn, user } = useUserSession()

  const fetch = computed(() => {
    const fetchOptions: FetchOptions = {
      baseURL: config.public.likeCoinAPIEndpoint,
    }
    if (hasLoggedIn && user.value?.token) {
      fetchOptions.headers = { Authorization: `Bearer ${user.value?.token}` }
    }
    return $fetch.create(fetchOptions)
  })

  function createNFTBookPurchase({
    email,
    nftClassId,
    from = 'liker_land',
    customPrice,
    priceIndex,
    coupon,
    language,
    referrer,
    utmCampaign,
    utmMedium,
    utmSource,
    gaClientId,
    gaSessionId,
    gadClickId,
    gadSource,
    fbClickId,
  }: {
    email?: string
    nftClassId: string
    customPrice?: number
    priceIndex: number
    coupon?: string
    from?: string
    language?: string
    referrer?: string
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    gaClientId?: string
    gaSessionId?: string
    gadClickId?: string
    gadSource?: string
    fbClickId?: string
  }) {
    return fetch.value<{ url: string, paymentId: string }>(`/likernft/book/purchase/${nftClassId}/new`, {
      method: 'POST',
      query: {
        price_index: priceIndex,
        from,
      },
      body: {
        email,
        customPriceInDecimal: customPrice !== undefined ? Math.floor(customPrice * 100) : undefined,
        coupon,
        language,
        referrer,
        utmCampaign,
        utmSource,
        utmMedium,
        gaClientId,
        gaSessionId,
        gadClickId,
        gadSource,
        fbClickId,
        site: '3ook.com',
      },
    })
  }

  function createNFTBookCartPurchase(
    items: CartItem[],
    {
      email,
      from = 'liker_land',
      coupon,
      cancelPage = 'list',
      language,
      referrer,
      utmCampaign,
      utmMedium,
      utmSource,
      gaClientId,
      gaSessionId,
      gadClickId,
      gadSource,
      fbClickId,
    }: {
      email?: string
      coupon?: string
      cancelPage?: 'list' | 'checkout'
      from?: string
      language?: string
      referrer?: string
      utmCampaign?: string
      utmMedium?: string
      utmSource?: string
      gaClientId?: string
      gaSessionId?: string
      gadClickId?: string
      gadSource?: string
      fbClickId?: string
    },
  ) {
    return fetch.value<{ url: string, paymentId: string }>(`/likernft/book/purchase/cart/new`, {
      method: 'POST',
      query: {
        from,
      },
      body: {
        email,
        items: items.map(item => ({
          // NOTE: The API only supports lowercase NFT class IDs
          classId: item.nftClassId.toLowerCase(),
          priceIndex: item.priceIndex,
          customPriceInDecimal: item.customPrice !== undefined ? Math.floor(item.customPrice * 100) : undefined,
          quantity: item.quantity,
        })),
        coupon,
        cancelPage,
        language,
        referrer,
        utmCampaign,
        utmSource,
        utmMedium,
        gaClientId,
        gaSessionId,
        gadClickId,
        gadSource,
        fbClickId,
        site: '3ook.com',
      },
    })
  }

  function fetchCartStatusById({ cartId, token }: { cartId: string, token: string }) {
    return fetch.value<FetchCartStatusByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/status`, { query: { token } })
  }

  function claimCartById({ cartId, token, paymentId, wallet }: { cartId: string, token: string, paymentId: string, wallet: string }) {
    return fetch.value<ClaimCartByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/claim`, {
      method: 'POST',
      query: { token },
      body: { wallet, paymentId },
    })
  }

  function fetchLikerPlusCheckoutLink({
    period = 'monthly',
    trialPeriodDays,
    mustCollectPaymentMethod,
    giftNFTClassId,
    from,
    referrer,
    utmCampaign,
    utmMedium,
    utmSource,
    gaClientId,
    gaSessionId,
    gadClickId,
    gadSource,
    fbClickId,
  }: {
    period: SubscriptionPlan
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    giftNFTClassId?: string
    from?: string
    referrer?: string
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    gaClientId?: string
    gaSessionId?: string
    gadClickId?: string
    gadSource?: string
    fbClickId?: string
  }) {
    return fetch.value<FetchLikerPlusCheckoutLinkResponseData>(`/plus/new`, {
      method: 'POST',
      query: { period, from },
      body: {
        trialPeriodDays,
        mustCollectPaymentMethod,
        giftClassId: giftNFTClassId,
        referrer,
        utmCampaign,
        utmMedium,
        utmSource,
        gaClientId,
        gaSessionId,
        gadClickId,
        gadSource,
        fbClickId,
      },
    })
  }

  function updateLikerPlusSubscription({
    period,
    giftNFTClassId,
    giftPriceIndex,
  }: {
    period: SubscriptionPlan
    giftNFTClassId?: string
    giftPriceIndex?: number
  }) {
    return fetch.value(`/plus/price`, {
      method: 'POST',
      body: {
        period,
        giftClassId: giftNFTClassId,
        giftPriceIndex,
      },
    })
  }

  function fetchLikerPlusGiftStatus() {
    return fetch.value<FetchLikerPlusGiftStatusResponseData>(`/plus/gift`)
  }

  function fetchLikerPlusBillingPortalLink() {
    return fetch.value<FetchLikerPlusBillingPortalLinkResponseData>(`/plus/portal`, { method: 'POST' })
  }

  async function migrateMagicEmailUser({
    wallet,
    signature,
    message,
  }: {
    wallet: string
    signature: string
    message: string
  }) {
    return fetch.value<MigrateMagicEmailUserResponseData>(`/wallet/evm/migrate/email/magic`, {
      method: 'POST',
      body: {
        wallet,
        signature,
        message,
      },
    })
  }

  async function sendCollectorMessage({
    nftClassId,
    paymentId,
    message,
    wallet,
    claimToken,
  }: {
    nftClassId: string
    paymentId: string
    message: string
    wallet: string
    claimToken: string
  }) {
    return fetch.value<string>(`/likernft/book/purchase/class/${nftClassId}/message/${paymentId}`, {
      method: 'POST',
      query: { token: claimToken },
      body: { message, wallet },
    })
  }

  function fetchClaimableFreeBooks() {
    return fetch.value<FetchFreeClaimableBooksResponseData>(`/likernft/book/purchase/free`)
  }

  function claimFreeBook(nftClassId: string) {
    return fetch.value<ClaimFreeBookResponseData>(`/likernft/book/purchase/free`, {
      method: 'POST',
      body: { classId: nftClassId },
    })
  }

  return {
    createNFTBookPurchase,
    createNFTBookCartPurchase,
    fetchCartStatusById,
    claimCartById,
    fetchLikerPlusCheckoutLink,
    updateLikerPlusSubscription,
    fetchLikerPlusGiftStatus,
    fetchLikerPlusBillingPortalLink,
    migrateMagicEmailUser,
    sendCollectorMessage,
    fetchClaimableFreeBooks,
    claimFreeBook,
  }
}
