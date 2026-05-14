import type { PostHog } from 'posthog-js'
import type { MaybeRefOrGetter } from 'vue'

export interface ABTestConfig {
  experimentKey: MaybeRefOrGetter<string>
}

export function useABTest(config: ABTestConfig) {
  const experimentKey = computed(() => toValue(config.experimentKey))
  const variant = ref<string | null>(null)

  const updateVariant = (posthog: PostHog) => {
    const flag = posthog.getFeatureFlag(experimentKey.value)
    variant.value = typeof flag === 'string' ? flag : null
  }

  let unsubscribe: (() => void) | undefined
  let stopWatch: (() => void) | undefined
  onMounted(() => {
    const { onLoaded } = useScriptPostHog()
    onLoaded(({ posthog }) => {
      unsubscribe = posthog.onFeatureFlags(() => {
        updateVariant(posthog)
      })
      updateVariant(posthog)
      stopWatch = watch(experimentKey, () => updateVariant(posthog))
    })
  })
  onScopeDispose(() => {
    unsubscribe?.()
    stopWatch?.()
  })

  function isVariant(variantName: string): boolean {
    return variant.value === variantName
  }

  return {
    variant: readonly(variant),
    isVariant,
  }
}
