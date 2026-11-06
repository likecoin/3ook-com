const TYPING_TAG_NAMES = ['INPUT', 'TEXTAREA', 'SELECT']
const ACTIVATABLE_TAG_NAMES = ['BUTTON', 'A']

// While an overlay is up it owns the keyboard: Reka traps focus inside it,
// so a key pressed there is meant for the overlay, not the page behind it.
const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

// Not typed as HTMLElement: the EPUB rendition runs in an iframe,
// so its targets come from another realm and fail `instanceof`.
interface KeyboardShortcutTarget {
  tagName?: string
  isContentEditable?: boolean
  closest?: (selector: string) => unknown
}

// A key pressed in a text field or an overlay belongs to it, whatever the modifiers.
export function getIsKeyboardShortcutTargetBlocked(event: KeyboardEvent) {
  const target = event.target as KeyboardShortcutTarget | null
  if (!target?.tagName) return false
  if (target.isContentEditable) return true
  if (TYPING_TAG_NAMES.includes(target.tagName)) return true
  return !!target.closest?.(OVERLAY_SELECTOR)
}

// A single-key shortcut must never swallow a keystroke meant for a text field,
// an input method, an overlay or the browser.
// Shift stays allowed — `*`, `S` and `F` need it.
export function getIsKeyboardShortcutBlocked(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return true
  if (event.isComposing) return true
  if (event.defaultPrevented) return true
  return getIsKeyboardShortcutTargetBlocked(event)
}

// Space and Enter activate a focused button or link, so they stay with it;
// every other key still reaches the shortcuts.
export function getIsKeyReservedByFocusedControl(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return false
  const target = event.target as KeyboardShortcutTarget | null
  return !!target?.tagName && ACTIVATABLE_TAG_NAMES.includes(target.tagName)
}
