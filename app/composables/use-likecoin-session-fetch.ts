import type { FetchOptions } from 'ofetch'

// Session-scoped $fetch for the LikeCoin API, shared by the
// use-*-session-api domain composables.
export function useLikeCoinSessionFetch() {
  const config = useRuntimeConfig()
  const { loggedIn: hasLoggedIn, user } = useUserSession()

  return computed(() => {
    const fetchOptions: FetchOptions = {
      baseURL: config.public.likeCoinAPIEndpoint,
    }
    if (hasLoggedIn.value && user.value?.token) {
      fetchOptions.headers = { Authorization: `Bearer ${user.value?.token}` }
    }
    // Method-aware retry: GET/HEAD recover from a transient `<no response>`,
    // while payload methods stay no-retry by default so a dropped checkout
    // POST (`purchase/cart/new`) is never replayed into a second payment.
    // Idempotent POSTs opt in explicitly per call (see `claimCartById`).
    return createRetryingFetch(fetchOptions)
  })
}
