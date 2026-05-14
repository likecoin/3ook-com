export function postToNative(data: { type: string, [key: string]: unknown }): void {
  if (typeof window === 'undefined') return
  window.ReactNativeWebView?.postMessage(JSON.stringify(data))
}

export function isNativeWebView(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView
}

export function isNativeFeatureSupported(feature: string): boolean {
  if (typeof window === 'undefined') return false
  const features = window.__nativeBridge?.features
  return Array.isArray(features) && features.includes(feature)
}

export function isNativeIntercomAvailable(): boolean {
  return isNativeWebView() && isNativeFeatureSupported('intercom')
}

export function isWebIntercomReady(): boolean {
  return typeof window !== 'undefined' && typeof window.Intercom === 'function'
}
