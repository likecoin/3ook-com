export interface BookGiftInfo {
  toEmail: string
  toName: string
  fromName: string
  message?: string
}

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
  coupon?: string
  isGift?: boolean
  giftInfo?: BookGiftInfo
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

export function useBookPurchaseSessionAPI() {
  const { isApp } = useAppDetection()
  const { detectedCountry } = useDetectedGeolocation()
  const fetch = useLikeCoinSessionFetch()

  function createNFTBookPurchase({
    email,
    nftClassId,
    from = 'liker_land',
    customPrice,
    priceIndex,
    coupon,
    currency,
    giftInfo,
    language,
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
    email?: string
    nftClassId: string
    customPrice?: number
    priceIndex: number
    coupon?: string
    currency?: string
    giftInfo?: BookGiftInfo
    from?: string
    language?: string
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
        currency,
        giftInfo,
        language,
        referrer,
        utmCampaign,
        utmSource,
        utmMedium,
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
        ipCountry: detectedCountry.value || undefined,
        site: '3ook.com',
        isApp: isApp.value || undefined,
      },
    })
  }

  function createNFTBookCartPurchase(
    items: CartItem[],
    {
      email,
      from = 'liker_land',
      coupon,
      currency,
      giftInfo,
      cancelPage = 'list',
      language,
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
      email?: string
      coupon?: string
      currency?: string
      giftInfo?: BookGiftInfo
      cancelPage?: 'list' | 'checkout'
      from?: string
      language?: string
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
        currency,
        giftInfo,
        cancelPage,
        language,
        referrer,
        utmCampaign,
        utmSource,
        utmMedium,
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
        ipCountry: detectedCountry.value || undefined,
        site: '3ook.com',
        isApp: isApp.value || undefined,
      },
    })
  }

  function fetchCartStatusById({ cartId, token }: { cartId: string, token: string }) {
    return fetch.value<FetchCartStatusByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/status`, { query: { token } })
  }

  function claimCartById({ cartId, token, paymentId, wallet }: { cartId: string, token: string, paymentId: string, wallet: string }) {
    return fetch.value<ClaimCartByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/claim`, {
      method: 'POST',
      // Idempotent: keyed on cartId/paymentId so a replay can't double-mint,
      // and re-claiming returns CART_ALREADY_CLAIMED* which the claim page
      // normalizes back into success.
      retry: API_MAX_RETRIES,
      query: { token },
      body: { wallet, paymentId },
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

  return {
    createNFTBookPurchase,
    createNFTBookCartPurchase,
    fetchCartStatusById,
    claimCartById,
    sendCollectorMessage,
  }
}
