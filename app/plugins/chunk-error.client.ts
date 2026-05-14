import { useSessionStorage } from '@vueuse/core'

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
]

const RELOAD_COOLDOWN_MS = 10_000
const RELOAD_FLUSH_DELAY_MS = 200

export default defineNuxtPlugin((nuxtApp) => {
  const lastReloadAt = useSessionStorage<number>('chunk_error_reload', 0)
  const hasEscalated = useSessionStorage<boolean>('chunk_error_escalated', false)
  const pwa = usePWA()
  let hasHandled = false

  const handle = async (error: unknown) => {
    const message = getErrorMessage(error)
    if (!CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern))) return
    if (hasHandled) return
    hasHandled = true

    const isLooping = Date.now() - lastReloadAt.value < RELOAD_COOLDOWN_MS
    let hadSW = false
    try {
      hadSW = !!(await navigator.serviceWorker?.getRegistration())
    }
    catch {
      // Telemetry only — fall back to false on browsers that reject the call.
    }

    const logChunkError = (reloaded: boolean, escalated: boolean) =>
      useLogEvent('chunk_error', {
        error_message: message,
        url: window.location.pathname,
        reloaded,
        escalated,
        had_sw: hadSW,
      })

    if (isLooping && hasEscalated.value) {
      logChunkError(false, true)
      console.error('[chunk-error] already escalated, surfacing error', error)
      return
    }

    if (isLooping) {
      // Cooperative reload didn't fix it — purge SW + caches and force a clean
      // fetch. Targets iOS WebKit where the cached "/" shell keeps re-serving
      // references to deleted chunk hashes after deploy.
      hasEscalated.value = true
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
        url.searchParams.set('_swrefresh', String(Date.now()))
        window.location.replace(url.toString())
      }, RELOAD_FLUSH_DELAY_MS)
      return
    }

    lastReloadAt.value = Date.now()
    logChunkError(true, false)
    // Give PostHog/GA a window to flush the event before navigating away
    setTimeout(async () => {
      try {
        if (pwa?.updateServiceWorker) {
          await pwa.updateServiceWorker(true)
          return
        }
      }
      catch (e) {
        console.warn('[chunk-error] updateServiceWorker failed', e)
      }
      window.location.reload()
    }, RELOAD_FLUSH_DELAY_MS)
  }

  nuxtApp.hook('app:chunkError', ({ error }) => handle(error))
  nuxtApp.hook('vue:error', error => handle(error))
})
