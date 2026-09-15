import type { PostHog } from 'posthog-js'
import type { MaybeRefOrGetter } from 'vue'

export interface ABTestConfig {
  experimentKey: MaybeRefOrGetter<string>
  // When true, mounting the component records no exposure; the variant is read
  // (and $feature_flag_called sent) only when captureExposure is called. Use for
  // experiments whose treatment happens at a later decision point (e.g. checkout).
  manualExposure?: boolean
  // Gate for experiments whose population is only known at runtime.
  // While false the flag is never read, so an ineligible visitor
  // records no exposure and gets no variant.
  enabled?: MaybeRefOrGetter<boolean>
}

export function useABTest(config: ABTestConfig) {
  const experimentKey = computed(() => toValue(config.experimentKey))
  const isEnabled = computed(() => toValue(config.enabled ?? true))
  const manualExposure = config.manualExposure ?? false
  const variant = ref<string | null>(null)
  let posthogInstance: PostHog | undefined

  // Reading the flag is what records the exposure,
  // hence the gate here rather than at the call sites.
  const readVariant = (posthog: PostHog): string | null => {
    const flag = isEnabled.value ? posthog.getFeatureFlag(experimentKey.value) : null
    const next = typeof flag === 'string' ? flag : null
    if (variant.value !== next) variant.value = next
    return next
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
      posthogInstance = posthog
      // Manual-exposure callers read the variant on demand via captureExposure,
      // so skip the reactive subscription that would fire exposures on render.
      if (manualExposure) return
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
