export default function (key: string, handler: (isVisible: boolean) => void) {
  const lazyLoadTriggerElement = useTemplateRef<HTMLLIElement>(key)
  const isVisible = useElementVisibility(lazyLoadTriggerElement, { once: true })
  watch(isVisible, handler)
  return { isVisible }
}
