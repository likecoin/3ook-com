export function postToNative(data: { type: string, [key: string]: unknown }): void {
  if (typeof window === 'undefined') return
  window.ReactNativeWebView?.postMessage(JSON.stringify(data))
}

export function isNativeWebView(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView
}

// Capabilities the shell injected. Untrusted like the rest of __nativeBridge,
// so sanitize into a fresh string-only array inside try/catch: a malformed
// injection reads as no capabilities instead of throwing into the debug panel.
export function getNativeFeatures(): readonly string[] {
  if (typeof window === 'undefined') return []
  try {
    const features = window.__nativeBridge?.features
    if (!Array.isArray(features)) return []
    return features.filter((feature): feature is string => typeof feature === 'string')
  }
  catch {
    return []
  }
}

export function isNativeFeatureSupported(feature: string): boolean {
  return getNativeFeatures().includes(feature)
}

// Install attribution the native shell exposes (Play Install Referrer on
// Android, Apple AdServices on iOS); null on web.
// Reads off `window`, so the value is untrusted: validate and sanitize into a
// fresh object (finite installedAt, string-only values) inside try/catch, so a
// malformed injection can't throw into — or leak non-strings through — checkout's
// getAnalyticsParameters. Returns null unless there's at least one fillable value.
export function getInstallAttribution(): InstallAttribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw: unknown = window.__nativeBridge?.installAttribution
    if (!raw || typeof raw !== 'object') return null
    const { installedAt, attribution } = raw as { installedAt?: unknown, attribution?: unknown }
    if (typeof installedAt !== 'number' || !Number.isFinite(installedAt)) return null
    if (!attribution || typeof attribution !== 'object') return null
    const clean: Record<string, string> = {}
    for (const [key, value] of Object.entries(attribution)) {
      if (typeof value === 'string' && value.length > 0) clean[key] = value
    }
    return Object.keys(clean).length ? { attribution: clean, installedAt } : null
  }
  catch {
    // Hostile/exotic shape (e.g. throwing getters) — treat as absent.
    return null
  }
}

// A hint, not a command: the shell applies its own engagement gate and both
// stores silently quota the prompt, so it usually will not appear. Store policy
// forbids tying it to a button press or preceding it with a question.
export function requestNativeStoreReview(reason: string): void {
  if (!isNativeWebView() || !isNativeFeatureSupported('storeReview')) return
  // The prompt itself is unobservable, so this request event is the only
  // measurable signal to correlate with review volume.
  useLogEvent('app_store_review_requested', { reason })
  postToNative({ type: 'requestStoreReview', reason })
}

// Asks the native shell to wipe the WKWebView SW registration + caches the web
// layer can't clear, then reload. Returns false on web / an app build without the
// capability, so the caller falls back to a web-only purge and reload.
export function requestNativeClearWebViewCache(): boolean {
  if (!isNativeWebView() || !isNativeFeatureSupported('clearWebViewCache')) return false
  postToNative({ type: 'clearWebViewCache' })
  return true
}

// Asks the native shell to drop its app-managed content caches (currently the
// on-disk TTS segment cache). Distinct from requestNativeClearWebViewCache,
// which reloads. No-op on web or an app build without the capability.
export function requestNativeClearCaches(): void {
  if (!isNativeWebView() || !isNativeFeatureSupported('clearNativeCaches')) return
  postToNative({ type: 'clearNativeCaches' })
}

export function isNativeIntercomAvailable(): boolean {
  return isNativeWebView() && isNativeFeatureSupported('intercom')
}

export function isWebIntercomReady(): boolean {
  return typeof window !== 'undefined' && typeof window.Intercom === 'function'
}
