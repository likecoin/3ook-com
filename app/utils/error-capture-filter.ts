// `capture_exceptions: { capture_console_errors: true }` (nuxt.config) turns
// every console.error into an $exception, including diagnostics third-party
// libraries write from inside their own try/catch.

// Wallet session state lives in IndexedDB; the browser tears the connection
// down on unload or WebView suspension, which is normal, not a failed connect.
export const WALLET_CONNECT_IDB_TEARDOWN = 'The database connection is closing'

// posthog-js synthesizes this when console.error gets a plain object instead of
// an Error. WalletConnect's pino logger does exactly that.
export const OBJECT_CAPTURED_MARKER = 'captured as exception with keys'

// epub-ts logs this from inside its own try/catch while measuring a Range. The
// DOM offset sits in the message text, so every offset groups as a new issue.
export const EPUB_RANGE_LOG_PREFIX = 'setting end offset to start container length failed'
const EPUB_RANGE_OFFSET_PATTERN = /(There is no child at offset )\d+/

// The native shell pushes this to the WebView when its stall watchdog gives up.
const PLAYBACK_STUCK_MESSAGE = 'Playback stuck'

// A grouping identity, deliberately not the matched text: rewording the native
// message must not also move the key that holds the issue together.
const PLAYBACK_STUCK_FINGERPRINT = 'native_playback_stuck'

export interface CapturedException {
  value?: string
  mechanism?: { synthetic?: boolean }
}

export function getIsIgnoredCapturedException(exception: CapturedException) {
  const value = exception.value || ''
  if (value.includes(WALLET_CONNECT_IDB_TEARDOWN)) return true
  // Only the synthetic ones: posthog sets that when the thrown value carried no
  // stack of its own, which is the logger-object case. A message-less object we
  // throw ourselves is a real bug and reports synthetic: false. Verified against
  // 14 days of production events — the split is exact.
  if (value.includes(OBJECT_CAPTURED_MARKER)) return exception.mechanism?.synthetic === true
  return false
}

// Returns the message unchanged unless it is the epub-ts Range log, whose
// trailing DOM offset is what splits one log across a dozen issues.
export function normalizeCapturedExceptionMessage(message: string) {
  if (!message.includes(EPUB_RANGE_LOG_PREFIX)) return message
  return message.replace(EPUB_RANGE_OFFSET_PATTERN, '$1<offset>')
}

// PostHog fingerprints on the stack when there is one, so an error whose frames
// depend on where it escaped forks a new issue per deploy. Undefined leaves
// PostHog's own fingerprint in place.
export function getStableExceptionFingerprint(exceptions: Array<CapturedException>) {
  if (exceptions.some(exception => exception.value?.includes(PLAYBACK_STUCK_MESSAGE))) {
    return PLAYBACK_STUCK_FINGERPRINT
  }
  return undefined
}

export function getIsLocalhostHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}
