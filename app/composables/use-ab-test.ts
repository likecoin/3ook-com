import type { PostHog } from 'posthog-js'
import type { MaybeRefOrGetter } from 'vue'

export interface ABTestConfig {
  experimentKey: MaybeRefOrGetter<string>
  // When true, mounting the component records no exposure; the variant is read
  // (and $feature_flag_called sent) only when captureExposure is called. Use for
  // experiments whose treatment happens at a later decision point (e.g. checkout).
  manualExposure?: boolean
}

export function useABTest(config: ABTestConfig) {
  const experimentKey = computed(() => toValue(config.experimentKey))
  const manualExposure = config.manualExposure ?? false
  const variant = ref<string | null>(null)
  let posthogInstance: PostHog | undefined

  const readVariant = (posthog: PostHog): string | null => {
    const flag = posthog.getFeatureFlag(experimentKey.value)
    const next = typeof flag === 'string' ? flag : null
    if (variant.value !== next) variant.value = next
    return next
  }

  let unsubscribe: (() => void) | undefined
  let stopWatch: (() => void) | undefined
  onMounted(() => {
    const { onLoaded } = useScriptPostHog()
    onLoaded(({ posthog }) => {
      posthogInstance = posthog
      // Manual-exposure callers read the variant on demand via captureExposure,
      // so skip the reactive subscription that would fire exposures on render.
      if (manualExposure) return
      unsubscribe = posthog.onFeatureFlags(() => readVariant(posthog))
      readVariant(posthog)
      stopWatch = watch(experimentKey, () => readVariant(posthog))
    })
  })
  onScopeDispose(() => {
    unsubscribe?.()
    stopWatch?.()
  })

  function isVariant(variantName: string): boolean {
    return variant.value === variantName
  }

  // Read the flag and record an exposure ($feature_flag_called) for the current
  // key, returning the variant. Returns the last known variant if PostHog hasn't
  // loaded yet; PostHog de-dupes the event per flag+value within a page load.
  function captureExposure(): string | null {
    return posthogInstance ? readVariant(posthogInstance) : variant.value
  }

  return {
    variant: readonly(variant),
    isVariant,
    captureExposure,
  }
}
