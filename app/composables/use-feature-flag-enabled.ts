// Awaitable flag read for code paths that decide once (e.g. route guards)
// instead of reacting. Resolves false on the server (PostHog is client-only)
// and on timeout, so callers never hang on a blocked PostHog script.
export async function fetchFeatureFlagEnabled(flag: string, { timeoutMs = 3000 } = {}) {
  if (import.meta.server) return false

  const { onLoaded } = useScriptPostHog()
  return new Promise<boolean>((resolve) => {
    let settled = false
    let unsubscribe: (() => void) | undefined
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe?.()
      resolve(value)
    }

    const timer = setTimeout(() => settle(false), timeoutMs)
    onLoaded(({ posthog }) => {
      unsubscribe = posthog.onFeatureFlags(() => {
        settle(posthog.isFeatureEnabled(flag) ?? false)
      })
      // onFeatureFlags fires synchronously when flags are already loaded, so it
      // may settle before unsubscribe was assigned — clean up the listener here.
      if (settled) unsubscribe?.()
    })
  })
}

export function useFeatureFlagEnabled(flag: string) {
  const isEnabled = ref<boolean | undefined>(undefined)
  const { onLoaded } = useScriptPostHog()
  let unsubscribe: (() => void) | undefined

  onLoaded(({ posthog }) => {
    isEnabled.value = posthog.isFeatureEnabled(flag)
    unsubscribe = posthog.onFeatureFlags(() => {
      isEnabled.value = posthog.isFeatureEnabled(flag)
    })
  })

  onScopeDispose(() => {
    unsubscribe?.()
  })

  return isEnabled
}
