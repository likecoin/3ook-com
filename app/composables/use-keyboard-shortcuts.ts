import type { MaybeRefOrGetter } from 'vue'

export type KeyboardShortcutMap = Record<string, (event: KeyboardEvent) => void>

export interface UseKeyboardShortcutsOptions {
  // Defaults to the app window. The EPUB reader also binds the rendition iframe,
  // so a click inside the book doesn't silence the shortcuts.
  target?: MaybeRefOrGetter<Window | undefined>
  isEnabled?: MaybeRefOrGetter<boolean>
}

export function useKeyboardShortcuts(
  shortcuts: MaybeRefOrGetter<KeyboardShortcutMap>,
  options: UseKeyboardShortcutsOptions = {},
) {
  // A target that is named but not yet resolved (the rendition iframe before it loads)
  // binds nothing, rather than falling back to the window a sibling call already holds.
  const eventTarget = computed(() => {
    if (options.target !== undefined) return toValue(options.target)
    return import.meta.client ? window : undefined
  })
  return useEventListener(eventTarget, 'keydown', (event: KeyboardEvent) => {
    if (options.isEnabled !== undefined && !toValue(options.isEnabled)) return
    if (getIsKeyboardShortcutBlocked(event)) return
    toValue(shortcuts)[event.key]?.(event)
  })
}
