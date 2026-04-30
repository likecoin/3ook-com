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
  let hasHandled = false

  const handle = (error: unknown) => {
    const message = getErrorMessage(error)
    if (!CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern))) return
    if (hasHandled) return
    hasHandled = true

    const isLooping = Date.now() - lastReloadAt.value < RELOAD_COOLDOWN_MS

    useLogEvent('chunk_error', {
      error_message: message,
      url: window.location.href,
      reloaded: !isLooping,
    })

    if (isLooping) {
      console.error('[chunk-error] reload already attempted recently, surfacing error', error)
      return
    }

    lastReloadAt.value = Date.now()
    // Give PostHog/GA a window to flush the event before navigating away
    setTimeout(() => {
      window.location.reload()
    }, RELOAD_FLUSH_DELAY_MS)
  }

  nuxtApp.hook('app:chunkError', ({ error }) => handle(error))
  nuxtApp.hook('vue:error', error => handle(error))
})
