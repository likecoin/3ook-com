import { useLocalStorage } from '@vueuse/core'

import {
  CHUNK_ERROR_FIRST_AT_KEY,
  CHUNK_ERROR_PATTERNS,
  CHUNK_ERROR_RELOADS_KEY,
  CHUNK_GUARD_OVERLAY_ID,
  clearPrebootChunkError,
  readPrebootChunkError,
} from '~~/shared/utils/chunk-guard'

const RELOAD_FLUSH_DELAY_MS = 200
const SW_UPDATE_TIMEOUT_MS = 1500
// Backstop reload delay when the native shell was asked to clear + reload:
// long enough for the native wipe to finish and tear this page down first,
// so the backstop normally only fires if the bridge message was lost.
const NATIVE_CLEAR_FALLBACK_MS = 3000
// Treat chunk errors within this window as one incident. The ladder (soft reload
// → cache purge + native clear → give up) advances one step per error inside the window, and
// resets once a fresh error lands after it — so an unrelated failure days later
// starts over from a soft reload rather than going straight to the cache purge.
const INCIDENT_WINDOW_MS = 5 * 60_000

export default defineNuxtPlugin((nuxtApp) => {
  // Tell the inline pre-boot guard (shared/utils/chunk-guard, injected into the
  // SSR <head>) that the in-app ladder owns recovery from here on.
  window.__chunkLadderActive = true

  // The guard surrenders before the app exists, so its full-screen retry banner
  // outlives a boot that then succeeds — most do, within seconds. Reaching here
  // is the boot signal it never had.
  document.getElementById(CHUNK_GUARD_OVERLAY_ID)?.remove()

  // A breadcrumb from the pre-boot guard means an earlier document died before
  // Nuxt booted and this boot is its recovery — report the incident PostHog
  // never saw. Clear only after the event is queued (inside onLoaded), so a
  // session where PostHog never loads keeps the marker for the next launch.
  const preboot = readPrebootChunkError()
  if (preboot) {
    const { onLoaded } = useScriptPostHog()
    onLoaded(() => {
      useLogEvent('chunk_error', {
        preboot: true,
        recovered: true,
        action: preboot.action,
        attempt: preboot.attempt,
        had_sw: preboot.had_sw,
        native_cleared: preboot.native_cleared,
        stood_down: !!preboot.stood_down,
        error_message: preboot.error_message,
        // A breadcrumb can outlive its session (PostHog never loaded); age
        // separates a just-now recovery from a days-old incident.
        age_ms: Date.now() - preboot.at,
        url: window.location.pathname,
      })
      clearPrebootChunkError()
    })
  }

  // localStorage, not sessionStorage: the native WebView keeps its service worker
  // and storage when the user force-quits, so a relaunch re-serves the same stale
  // "/" shell referencing deleted chunk hashes. Persisting the ladder lets a
  // relaunch advance to the cache purge instead of restarting from a soft reload
  // that can't fix it — otherwise "kill the app" never recovers, only a reinstall.
  const firstErrorAt = useLocalStorage<number>(CHUNK_ERROR_FIRST_AT_KEY, 0)
  const reloadCount = useLocalStorage<number>(CHUNK_ERROR_RELOADS_KEY, 0)
  const pwa = usePWA()

  const runLadder = async (error: unknown, message: string) => {
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

    const logChunkError = (
      reloaded: boolean,
      escalated: boolean,
      extra?: Record<string, unknown>,
    ) =>
      useLogEvent('chunk_error', {
        error_message: message,
        url: window.location.pathname,
        reloaded,
        escalated,
        had_sw: hadSW,
        ...extra,
      })

    // The purge rung (web purge + native clear where available) already ran and
    // didn't fix it. Stop reloading and surface the error instead of looping.
    if (effectiveAttempt >= 2) {
      logChunkError(false, true)
      console.error('[chunk-error] already escalated, surfacing error', error)
      return false
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
      // On app builds with the capability, also clear natively in this same rung —
      // the web purge below can't evict WKWebView's own SW registration + HTTP
      // caches. Requested first so the native wipe overlaps the web purge; the
      // native shell reloads once wiped, and the delayed replace is its backstop.
      const nativeClearRequested = requestNativeClearWebViewCache()
      if (nativeClearRequested) console.warn('[chunk-error] requested native cache clear')
      logChunkError(true, true, nativeClearRequested ? { native_cleared: true } : undefined)
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
      }, nativeClearRequested ? NATIVE_CLEAR_FALLBACK_MS : RELOAD_FLUSH_DELAY_MS)
      return true
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
    return true
  }

  // One incident, one decision. Vite both dispatches vite:preloadError and
  // rejects the import, so the same failure arrives twice; memoising the
  // promise makes the second arrival inherit the first one's outcome instead
  // of reporting "handled" for a rung that actually gave up.
  let ladderDecision: Promise<boolean> | undefined
  let ladderDecidedAt = 0

  // Resolves to whether the ladder took ownership. False means the caller
  // should surface the error: not a chunk error, or we already escalated and
  // reloading again would only loop.
  const handle = (error: unknown) => {
    const message = getErrorMessage(error)
    if (!CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern))) return Promise.resolve(false)
    // Expire the memo on the same window the ladder resets on: a page that
    // survived the give-up rung (the only decision a reload doesn't tear down)
    // then fails again much later is a new incident, so let it start over from
    // a soft reload instead of inheriting the old "already escalated".
    if (ladderDecision && Date.now() - ladderDecidedAt > INCIDENT_WINDOW_MS) ladderDecision = undefined
    if (!ladderDecision) {
      ladderDecidedAt = Date.now()
      ladderDecision = runLadder(error, message)
    }
    return ladderDecision
  }

  // useLogEvent and the purge run outside any try/catch, and Nuxt awaits the
  // vue:error hook — so an unwatched rejection here would surface as a bare
  // unhandled rejection instead of the ladder's own reporting.
  const handleQuietly = (error: unknown) => {
    handle(error).catch(e => console.warn('[chunk-error] handler failed', e))
  }

  nuxtApp.hook('app:chunkError', ({ error }) => {
    handleQuietly(error)
  })
  nuxtApp.hook('vue:error', (error) => {
    handleQuietly(error)
  })
  // Vite emits this for failed dynamic-import preloads that don't always
  // surface through the Nuxt hooks above. Payload carries the original error.
  window.addEventListener('vite:preloadError', (event) => {
    handleQuietly((event as Event & { payload?: unknown }).payload)
  })

  // Errors caught by a local try/catch never reach the hooks above, so
  // use-error-handler hands them here before falling back to the error modal.
  return { provide: { claimChunkError: handle } }
})
