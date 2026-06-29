interface InstallAttribution {
  // utm_* / click ids parsed from the native Play install referrer.
  attribution: Record<string, string>
  // Epoch ms of first capture, for freshness gating (e.g. fbclid).
  installedAt: number
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
