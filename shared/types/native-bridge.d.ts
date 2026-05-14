interface Window {
  ReactNativeWebView?: {
    postMessage(message: string): void
  }
  __nativeBridge?: { features?: readonly string[] }
}

interface WindowEventMap {
  nativeBridgeEvent: CustomEvent<{ type: string, [key: string]: unknown }>
}
