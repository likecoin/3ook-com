// Temporary facade over the domain-scoped LikeCoin session API composables.
// Prefer the use-*-session-api composables directly in new code; this facade
// exists to keep existing consumers compiling and will be removed once they
// are migrated.
export function useLikeCoinSessionAPI() {
  return {
    ...useBookPurchaseSessionAPI(),
    ...useFreeBookSessionAPI(),
    ...usePlusSessionAPI(),
    ...usePlusGiftSessionAPI(),
    ...useUserAccountSessionAPI(),
    ...useStripeConnectSessionAPI(),
  }
}
