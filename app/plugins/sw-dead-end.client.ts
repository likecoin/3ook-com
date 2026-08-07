// Report a service worker navigation dead end recorded by an earlier document —
// see utils/sw-dead-end for why the worker can't report it itself.
export default defineNuxtPlugin((nuxtApp) => {
  const report = () => {
    readSWDeadEnd().then((deadEnd) => {
      if (!deadEnd) return
      // The read is async, so useScriptPostHog needs the context restored.
      nuxtApp.runWithContext(() => {
        const { onLoaded } = useScriptPostHog()
        onLoaded(() => {
          useLogEvent('sw_navigation_dead_end', {
            was_online: deadEnd.wasOnline,
            cache_keys_count: deadEnd.cacheKeysCount,
            pathname: deadEnd.pathname,
            retry: deadEnd.retry,
            // A breadcrumb can outlive its session (PostHog never loaded); age
            // separates a just-now recovery from a days-old incident.
            age_ms: Date.now() - deadEnd.at,
          })
          // Clear only after the event is queued, so a session where PostHog
          // never loads keeps the marker for the next launch.
          clearSWDeadEnd()
        })
      })
    }).catch(() => {
      // Best-effort telemetry — never let it interfere with boot.
    })
  }
  // Idle: this reports a past incident, so it must not compete with the
  // CacheStorage reads serving the current boot on WebKit.
  if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(report, { timeout: 2000 })
  else setTimeout(report, 0)
})
