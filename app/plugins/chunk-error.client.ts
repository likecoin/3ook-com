import { useLocalStorage } from '@vueuse/core'

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
]

const RELOAD_FLUSH_DELAY_MS = 200
const SW_UPDATE_TIMEOUT_MS = 1500
// Treat chunk errors within this window as one incident. The ladder (soft reload
// → cache purge → give up) advances one step per error inside the window, and
// resets once a fresh error lands after it — so an unrelated failure days later
// starts over from a soft reload rather than going straight to the cache purge.
const INCIDENT_WINDOW_MS = 5 * 60_000

export default defineNuxtPlugin((nuxtApp) => {
  // localStorage, not sessionStorage: the native WebView keeps its service worker
  // and storage when the user force-quits, so a relaunch re-serves the same stale
  // "/" shell referencing deleted chunk hashes. Persisting the ladder lets a
  // relaunch advance to the cache purge instead of restarting from a soft reload
  // that can't fix it — otherwise "kill the app" never recovers, only a reinstall.
  const firstErrorAt = useLocalStorage<number>('chunk_error_first_at', 0)
  const reloadCount = useLocalStorage<number>('chunk_error_reloads', 0)
  const pwa = usePWA()
  let hasHandled = false

  const handle = async (error: unknown) => {
    const message = getErrorMessage(error)
    if (!CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern))) return
    if (hasHandled) return
    hasHandled = true

    const now = Date.now()
    // Fresh incident if the previous chunk error was long ago — reset the ladder.
    if (now - firstErrorAt.value > INCIDENT_WINDOW_MS) {
      firstErrorAt.value = now
      reloadCount.value = 0
    }
    const attempt = reloadCount.value

    let hadSW = false
    try {
      hadSW = !!(await navigator.serviceWorker?.getRegistration())
    }
    catch {
      // Telemetry only — fall back to false on browsers that reject the call.
    }

    // A present SW re-serves the cached stale "/" (NetworkFirst nav route), so a gentle
    // reload can't recover — skip that rung and purge immediately. Only on the first
    // error, else a SW that appears after the soft reload would skip the purge too.
    const effectiveAttempt = hadSW && attempt === 0 ? 1 : attempt

    const logChunkError = (reloaded: boolean, escalated: boolean) =>
      useLogEvent('chunk_error', {
        error_message: message,
        url: window.location.pathname,
        reloaded,
        escalated,
        had_sw: hadSW,
      })

    // Both the soft reload (if any) and the cache purge failed (e.g. the network
    // is genuinely unreachable). Stop reloading and surface the error instead of
    // looping. Reached at the second error when a SW is present, the third otherwise.
    if (effectiveAttempt >= 2) {
      logChunkError(false, true)
      console.error('[chunk-error] already escalated, surfacing error', error)
      return
    }

    // Advance the ladder for the two reload branches below (give-up returned above).
    // Persist effectiveAttempt, not attempt, so a purge that unregisters the SW still
    // surfaces on the next error even if that reload no longer sees a SW.
    reloadCount.value = effectiveAttempt + 1

    if (effectiveAttempt >= 1) {
      // Soft reload didn't fix it — or a SW is present and would just re-serve the
      // stale shell — so purge SW + caches and force a clean fetch.
      // Targets iOS WebKit where the cached "/" shell (NetworkFirst document
      // cache) keeps re-serving references to deleted chunk hashes after deploy.
      logChunkError(true, true)
      try {
        const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
        await Promise.all(regs.map(r => r.unregister()))
        const keys = (await caches?.keys()) ?? []
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      catch (e) {
        console.warn('[chunk-error] cache purge failed', e)
      }
      setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('_swrefresh', String(now))
        window.location.replace(url.toString())
      }, RELOAD_FLUSH_DELAY_MS)
      return
    }

    // First error: activate any newly deployed worker, then reload once it has
    // claimed the page (controllerchange) — reloading before then would just
    // re-load the same stale build. If no worker is waiting it never fires, so a
    // timeout forces the reload and we never strand on the blank page.
    logChunkError(true, false)
    setTimeout(() => {
      let reloaded = false
      const reload = () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()
      }
      navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true })
      // .then() defers the call so a synchronous throw also lands in .catch,
      // otherwise it would skip the timeout fallback below and strand the page.
      Promise.resolve().then(() => pwa?.updateServiceWorker?.(false)).catch((e) => {
        console.warn('[chunk-error] updateServiceWorker failed', e)
      })
      setTimeout(reload, SW_UPDATE_TIMEOUT_MS)
    }, RELOAD_FLUSH_DELAY_MS)
  }

  nuxtApp.hook('app:chunkError', ({ error }) => handle(error))
  nuxtApp.hook('vue:error', error => handle(error))
})
