import type { PostHog } from 'posthog-js'
import type { MaybeRefOrGetter } from 'vue'

export interface ABTestConfig {
  experimentKey: MaybeRefOrGetter<string>
  // Gate for experiments whose population is only known at runtime.
  // While false the flag is never read, so an ineligible visitor
  // records no exposure and gets no variant.
  enabled?: MaybeRefOrGetter<boolean>
}

export function useABTest(config: ABTestConfig) {
  const experimentKey = computed(() => toValue(config.experimentKey))
  const isEnabled = computed(() => toValue(config.enabled ?? true))
  const variant = ref<string | null>(null)

  // Reading the flag is what records the exposure,
  // hence the gate here rather than at the call sites.
  const readVariant = (posthog: PostHog) => {
    const flag = isEnabled.value ? posthog.getFeatureFlag(experimentKey.value) : null
    const next = typeof flag === 'string' ? flag : null
    if (variant.value !== next) variant.value = next
  }

  let unsubscribe: (() => void) | undefined
  let stopWatch: (() => void) | undefined
  let isDisposed = false
  onMounted(() => {
    const { onLoaded } = useScriptPostHog()
    onLoaded(({ posthog }) => {
      // A component unmounted before PostHog loads has already run its dispose,
      // so subscribing now would register a handler nothing can remove.
      if (isDisposed) return
      unsubscribe = posthog.onFeatureFlags(() => readVariant(posthog))
      readVariant(posthog)
      stopWatch = watch([experimentKey, isEnabled], () => readVariant(posthog))
    })
  })
  onScopeDispose(() => {
    isDisposed = true
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
