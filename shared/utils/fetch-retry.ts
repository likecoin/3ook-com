import type { FetchOptions } from 'ofetch'

/**
 * Retry count for idempotent requests. The backoff curve in
 * `createRetryingFetch` assumes every retrying request starts here, so a
 * call site opting a POST into retry MUST pass exactly this value.
 */
export const API_MAX_RETRIES = 2

/**
 * Wraps `$fetch.create` with a method-aware retry policy.
 *
 * A transient network drop surfaces in ofetch as a `<no response>`
 * error, which it treats as HTTP 500 and so retries when `retry > 0`.
 * ofetch's defaults are conservative (GET/HEAD retry once, payload
 * methods never), so an idempotent request on a flaky connection fails
 * hard instead of recovering.
 *
 * Do NOT use for clients that perform financial / on-chain mutations
 * (e.g. the LikeCoin session API) — a replayed purchase after a
 * `<no response>` double-charges.
 */
export function createRetryingFetch(options: FetchOptions = {}) {
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
    },
  })
}
