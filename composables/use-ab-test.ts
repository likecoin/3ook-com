import type { PostHog } from 'posthog-js'

export interface ABTestConfig {
  experimentKey: string
}

export function useABTest(config: ABTestConfig) {
  const { experimentKey } = config
  const variant = ref<string | null>(null)

  const updateVariant = (posthog: PostHog) => {
    const flag = posthog.getFeatureFlag(experimentKey)
    variant.value = typeof flag === 'string' ? flag : null
  }

  let unsubscribe: (() => void) | undefined
  onMounted(() => {
    const { onLoaded } = useScriptPostHog()
    onLoaded(({ posthog }) => {
      unsubscribe = posthog.onFeatureFlags(() => {
        updateVariant(posthog)
      })
      updateVariant(posthog)
    })
  })
  onScopeDispose(() => {
    unsubscribe?.()
  })

  function isVariant(variantName: string): boolean {
    return variant.value === variantName
  }

  return {
    variant: readonly(variant),
    isVariant,
  }
}
