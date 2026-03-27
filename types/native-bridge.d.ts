interface Window {
  ReactNativeWebView?: {
    postMessage(message: string): void
  }
}

interface WindowEventMap {
  nativeBridgeEvent: CustomEvent<{ type: string, [key: string]: unknown }>
}
