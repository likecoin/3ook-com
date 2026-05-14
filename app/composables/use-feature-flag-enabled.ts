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
