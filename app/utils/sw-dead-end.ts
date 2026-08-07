// Durable breadcrumb for a service worker navigation dead end — the last rung
// of the NetworkFirst handlerDidError ladder in nuxt.config.ts, where nothing is
// cached and the network already timed out. The worker can't report it itself
// (having no client to talk to is the failure, and localStorage is unavailable
// in a service worker), so the sw-dead-end plugin reports it on the next boot.

// Duplicated as literals inside that handler; a unit test keeps them in sync.
export const SW_DIAGNOSTICS_CACHE = 'sw-diagnostics'
export const SW_DEAD_END_URL = '/__sw_dead_end'

// 'ok' when the retry rescued the navigation; the rest mean the user still got
// a dead page.
export type SWDeadEndRetry = 'ok' | 'failed' | `status_${number}`

export interface SWDeadEnd {
  at: number
  wasOnline: boolean
  // Entries in the html-pages cache at failure time. Zero confirms the empty
  // cache hypothesis; non-zero means the ladder's earlier rungs misfired.
  cacheKeysCount: number
  pathname: string
  retry: SWDeadEndRetry
}

export async function readSWDeadEnd(): Promise<SWDeadEnd | null> {
  if (!import.meta.client || typeof caches === 'undefined') return null
  let response: Response | undefined
  try {
    // caches.match, not caches.open: open() would create an empty diagnostics
    // cache on every boot of every device that never hits a dead end.
    response = await caches.match(SW_DEAD_END_URL, { cacheName: SW_DIAGNOSTICS_CACHE })
  }
  catch {
    // Storage unavailable — don't try to clear, that just repeats the failing
    // round trip on every boot.
    return null
  }
  if (!response) return null
  try {
    const parsed = await response.json() as Partial<SWDeadEnd>
    const { at, wasOnline, cacheKeysCount, pathname, retry } = parsed
    if (typeof at === 'number' && Number.isFinite(at)
      && typeof wasOnline === 'boolean'
      && typeof cacheKeysCount === 'number' && Number.isFinite(cacheKeysCount)
      && typeof pathname === 'string'
      && typeof retry === 'string') {
      return { at, wasOnline, cacheKeysCount, pathname, retry }
    }
  }
  catch {
    // Unparsable blob — fall through and drop it.
  }
  // Corrupt or partial: drop it so it isn't re-read on every launch, and can't
  // leak undefined params into the reported event.
  await clearSWDeadEnd()
  return null
}

export async function clearSWDeadEnd() {
  if (!import.meta.client || typeof caches === 'undefined') return
  try {
    const cache = await caches.open(SW_DIAGNOSTICS_CACHE)
    await cache.delete(SW_DEAD_END_URL)
  }
  catch {
    // Best-effort.
  }
}
