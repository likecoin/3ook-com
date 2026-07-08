import type { UseElementVisibilityOptions } from '@vueuse/core'

export default function (
  key: string,
  handler: (isVisible: boolean) => void,
  options?: Pick<UseElementVisibilityOptions, 'rootMargin' | 'threshold'>,
) {
  const lazyLoadTriggerElement = useTemplateRef<HTMLElement>(key)
  const isVisible = useElementVisibility(lazyLoadTriggerElement, { once: true, ...options })
  watch(isVisible, handler)
  return { isVisible }
}
