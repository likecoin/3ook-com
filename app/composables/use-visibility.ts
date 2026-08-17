import type { UseElementVisibilityOptions } from '@vueuse/core'
import type { ComponentPublicInstance } from 'vue'

export default function (
  key: string,
  handler?: (isVisible: boolean) => void,
  options?: Pick<UseElementVisibilityOptions, 'rootMargin' | 'threshold'>,
) {
  // Component refs are resolved to their root element by VueUse's unrefElement.
  const lazyLoadTriggerElement = useTemplateRef<HTMLElement | ComponentPublicInstance>(key)
  const isVisible = useElementVisibility(lazyLoadTriggerElement, { once: true, ...options })
  // `once` stops the observer on the first true->false edge, so anything on
  // screen at mount reverts to false once scrolled away. Latch it, or a one-shot
  // consumer waiting on slower data loses its trigger for good.
  const hasBeenVisible = ref(false)
  watch(isVisible, (value) => {
    if (value) hasBeenVisible.value = true
  })
  // Callers that only gate a query on `isVisible` need no side effect.
  if (handler) watch(isVisible, handler)
  return { isVisible, hasBeenVisible }
}
