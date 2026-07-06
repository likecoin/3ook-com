import type { FetchOptions } from 'ofetch'

/**
 * Retry count for idempotent requests. The backoff curve in
 * `createRetryingFetch` assumes every retrying request starts here, so a
 * call site opting a POST into retry MUST pass exactly this value.
 */
export const API_MAX_RETRIES = 2

/**
 * Per-attempt fetch timeout (ms). Paired with `API_MAX_RETRIES` as the
 * shared retry/timeout policy; re-armed on each retry — see `createRetryingFetch`.
 */
export const API_FETCH_TIMEOUT_MS = 30_000

/**
 * `AbortSignal.timeout` polyfill — the iOS 15 WKWebView this bounds lacks it
 * (landed in Safari 16.0). Aborts with a `TimeoutError` to match the native
 * semantics; on iOS 15.1 the reason is dropped and falls back to `AbortError`.
 */
function createTimeoutSignal(timeout: number) {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeout,
  )
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  return controller.signal
}

/**
 * Wraps `$fetch.create` with a method-aware retry policy.
 *
 * A transient network drop surfaces in ofetch as a `<no response>`
 * error, which it treats as HTTP 500 and so retries when `retry > 0`.
 * ofetch's defaults are conservative (GET/HEAD retry once, payload
 * methods never), so an idempotent request on a flaky connection fails
 * hard instead of recovering.
 *
 * Pass `timeout` (ms) to bound every attempt: a wedged connection (iOS
 * WKWebView can poison one so it never responds) otherwise hangs the
 * `await` forever, stranding loading state that only clears in a
 * request's `finally`. We re-arm a fresh timeout signal per attempt in
 * `onRequest` — ofetch's own `timeout` only arms when no signal is set
 * and reuses the aborted signal across retries, so it would leave
 * retries unbounded.
 *
 * Do NOT use for clients that perform financial / on-chain mutations
 * (e.g. the LikeCoin session API) — a replayed purchase after a
 * `<no response>` double-charges.
 */
export function createRetryingFetch({ timeout, ...options }: FetchOptions = {}) {
  return $fetch.create({
    ...options,
    retryDelay({ options }) {
      // Jittered exponential backoff; ofetch decrements `retry` per
      // attempt, so (max - remaining) is the 0-indexed attempt.
      const remaining = typeof options.retry === 'number' ? options.retry : 0
      const attempt = Math.max(0, API_MAX_RETRIES - remaining)
      return Math.min(300 * 2 ** attempt, 1500) + Math.floor(Math.random() * 150)
    },
    onRequest({ options }) {
      if (options.retry === undefined) {
        const method = (options.method ?? 'GET').toUpperCase()
        options.retry = method === 'GET' || method === 'HEAD' ? API_MAX_RETRIES : 0
      }
      // Runs per attempt (including retries), so this re-arms the timeout
      // on each retry and replaces any aborted signal from the last one.
      if (timeout) {
        options.signal = createTimeoutSignal(timeout)
      }
    },
  })
}
