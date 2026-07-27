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
  // Callers that only gate a query on `isVisible` need no side effect.
  if (handler) watch(isVisible, handler)
  return { isVisible }
}
