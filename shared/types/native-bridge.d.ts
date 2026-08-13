interface InstallAttribution {
  // utm_* / click ids from the native install referrer (Play / Apple AdServices).
  attribution: Record<string, string>
  // Epoch ms of first capture, for freshness gating (e.g. fbclid).
  installedAt: number
  // Affiliate/channel id (`from`) — money-routing, kept separate from the
  // analytics `attribution` map so it never feeds the last-touch UTM fallback.
  affiliateFrom?: string
}

interface Window {
  ReactNativeWebView?: {
    postMessage(message: string): void
  }
  __nativeBridge?: {
    features?: readonly string[]
    installAttribution?: InstallAttribution
  }
}

interface WindowEventMap {
  nativeBridgeEvent: CustomEvent<{ type: string, [key: string]: unknown }>
}
