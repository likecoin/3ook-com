import { createPersistedState } from 'pinia-plugin-persistedstate'

// Coalesce rapid setItem calls so a burst of Pinia mutations (e.g., 100 books
// pushed inside a single fetch loop) doesn't trigger 100 JSON.stringify+write
// round-trips on the main thread. Reads return the pending value so hydration
// order stays correct.
function createDebouncedStorage(base: Storage, delayMs = 300): Storage {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const pending = new Map<string, string>()

  // setItem can throw (QuotaExceededError, Safari private mode). Swallow so a
  // persistence failure doesn't crash pagehide/visibilitychange handlers.
  function safeSetItem(key: string, value: string) {
    try {
      base.setItem(key, value)
    }
    catch (error) {
      console.warn('[pinia-persistedstate] failed to persist', key, error)
    }
  }

  // Browsers don't run pending setTimeout callbacks during unload, so a
  // refresh inside the debounce window would otherwise drop the latest state.
  // pagehide fires on reload/close/bfcache; visibilitychange:hidden catches
  // mobile tab-switch where pagehide is unreliable.
  function flushPending() {
    for (const [key, value] of pending) safeSetItem(key, value)
    for (const timer of timers.values()) clearTimeout(timer)
    pending.clear()
    timers.clear()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flushPending()
  }
  window.addEventListener('pagehide', flushPending)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('pagehide', flushPending)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    })
  }

  return {
    ...base,
    // Storage.length is a prototype getter, so spread doesn't capture it.
    // Use a live getter to stay in sync with the underlying storage.
    get length() { return base.length },
    clear: () => base.clear(),
    key: index => base.key(index),
    getItem: key => pending.get(key) ?? base.getItem(key),
    setItem: (key, value) => {
      pending.set(key, value)
      const existing = timers.get(key)
      if (existing) clearTimeout(existing)
      timers.set(key, setTimeout(() => {
        safeSetItem(key, value)
        pending.delete(key)
        timers.delete(key)
      }, delayMs))
    },
    removeItem: (key) => {
      const existing = timers.get(key)
      if (existing) clearTimeout(existing)
      pending.delete(key)
      timers.delete(key)
      base.removeItem(key)
    },
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia as import('pinia').Pinia
  pinia.use(createPersistedState({ storage: createDebouncedStorage(localStorage) }))
})
