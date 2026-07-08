export interface FetchStripeConnectStatusResponseData {
  hasAccount: boolean
  isReady: boolean
  email?: string
  stripeConnectAccountId?: string
}

export interface CreateStripeConnectAccountResponseData {
  url: string
}

export interface FetchStripeConnectLoginLinkResponseData {
  url: string
}

export interface RefreshStripeConnectStatusResponseData {
  isReady: boolean
}

export function useStripeConnectSessionAPI() {
  const fetch = useLikeCoinSessionFetch()

  async function fetchStripeConnectStatus({ wallet }: { wallet: string }) {
    try {
      return await fetch.value<FetchStripeConnectStatusResponseData>(
        `/likernft/book/user/connect/status`,
        { query: { wallet } },
      )
    }
    catch (error) {
      if (getErrorStatusCode(error) === 404 || getErrorMessage(error) === 'USER_NOT_FOUND') {
        return { hasAccount: false, isReady: false } satisfies FetchStripeConnectStatusResponseData
      }
      throw error
    }
  }

  function createStripeConnectAccount() {
    return fetch.value<CreateStripeConnectAccountResponseData>(
      `/likernft/book/user/connect/new`,
      { method: 'POST', body: { site: 'store' } },
    )
  }

  function fetchStripeConnectLoginLink() {
    return fetch.value<FetchStripeConnectLoginLinkResponseData>(
      `/likernft/book/user/connect/login`,
      { method: 'POST' },
    )
  }

  function refreshStripeConnectStatus() {
    return fetch.value<RefreshStripeConnectStatusResponseData>(
      `/likernft/book/user/connect/refresh`,
      { method: 'POST' },
    )
  }

  return {
    fetchStripeConnectStatus,
    createStripeConnectAccount,
    fetchStripeConnectLoginLink,
    refreshStripeConnectStatus,
  }
}
