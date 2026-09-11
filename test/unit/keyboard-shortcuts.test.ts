// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { getIsKeyboardShortcutBlocked } from '~/utils/keyboard-shortcuts'

function createKeyboardEvent(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...init })
}

function dispatchOn(element: Element, event: KeyboardEvent) {
  document.body.appendChild(element)
  element.dispatchEvent(event)
  element.remove()
}

describe('getIsKeyboardShortcutBlocked', () => {
  it('lets a bare key through', () => {
    expect(getIsKeyboardShortcutBlocked(createKeyboardEvent('j'))).toBe(false)
  })

  it('lets a shifted key through, since `*` and `F` need Shift', () => {
    expect(getIsKeyboardShortcutBlocked(createKeyboardEvent('*', { shiftKey: true }))).toBe(false)
  })

  it.each(['metaKey', 'ctrlKey', 'altKey'] as const)('blocks a %s combo', (modifier) => {
    expect(getIsKeyboardShortcutBlocked(createKeyboardEvent('f', { [modifier]: true }))).toBe(true)
  })

  it('blocks a key typed mid-composition', () => {
    expect(getIsKeyboardShortcutBlocked(createKeyboardEvent('k', { isComposing: true }))).toBe(true)
  })

  it('blocks a key another handler already claimed', () => {
    const event = createKeyboardEvent('k')
    event.preventDefault()
    expect(getIsKeyboardShortcutBlocked(event)).toBe(true)
  })

  it.each(['input', 'textarea', 'select'])('blocks a key typed into a %s', (tagName) => {
    const event = createKeyboardEvent('s')
    dispatchOn(document.createElement(tagName), event)
    expect(getIsKeyboardShortcutBlocked(event)).toBe(true)
  })

  it('blocks a key typed into a contenteditable element', () => {
    const element = document.createElement('div')
    element.setAttribute('contenteditable', 'true')
    const event = createKeyboardEvent('s')
    dispatchOn(element, event)
    expect(getIsKeyboardShortcutBlocked(event)).toBe(true)
  })

  it('blocks a key pressed inside an open overlay', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const closeButton = document.createElement('button')
    dialog.appendChild(closeButton)
    document.body.appendChild(dialog)
    const event = createKeyboardEvent('f')
    closeButton.dispatchEvent(event)
    dialog.remove()
    expect(getIsKeyboardShortcutBlocked(event)).toBe(true)
  })

  it('lets a key pressed on a plain button through', () => {
    const event = createKeyboardEvent('k')
    dispatchOn(document.createElement('button'), event)
    expect(getIsKeyboardShortcutBlocked(event)).toBe(false)
  })
})
