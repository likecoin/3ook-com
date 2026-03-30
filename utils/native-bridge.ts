export function postToNative(data: { type: string, [key: string]: unknown }): void {
  if (typeof window === 'undefined') return
  window.ReactNativeWebView?.postMessage(JSON.stringify(data))
}

export function isNativeWebView(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView
}
