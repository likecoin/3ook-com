// @vitest-environment node
// Reads the guard off disk, which the Nuxt environment's stubbed fs cannot do.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'acorn'
import { Window } from 'happy-dom'

const SCRIPT = readFileSync(
  new URL('../../app/assets/js/browser-support-check.js', import.meta.url),
  'utf8',
)

interface SetupOptions {
  hasColorMix?: boolean
  hasStructuredClone?: boolean
  url?: string
  language?: string
  userAgent?: string
  // Reuse a window from an earlier run to carry its storage across, standing in
  // for relaunching the app on the same device.
  win?: Window
}

// Runs the guard against a fresh happy-dom window with the feature detections
// it gates on stubbed out, mirroring how nuxt.config.ts inlines it into <head>.
function setup(options: SetupOptions = {}) {
  const {
    hasColorMix = true,
    hasStructuredClone = true,
    url = 'https://3ook.com/en/store',
    language = 'en-US',
    userAgent = 'Chrome/108.0.0.0',
  } = options

  const win = options.win ?? new Window({
    url,
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  })
  Object.defineProperty(win.navigator, 'language', { value: language, configurable: true })
  Object.defineProperty(win.navigator, 'userAgent', { value: userAgent, configurable: true })

  const css = {
    supports: (value: string) => (value.indexOf('color-mix') === -1 ? true : hasColorMix),
    registerProperty: () => {},
  }

  new Function(
    'window', 'document', 'navigator', 'screen', 'CSS', 'structuredClone', 'console',
    SCRIPT,
  )(
    win,
    win.document,
    win.navigator,
    { width: 1080, height: 1440 },
    css,
    hasStructuredClone ? () => {} : undefined,
    { error: () => {} },
  )

  const overlay = win.document.querySelector('.bsc')
  return {
    win,
    overlay,
    proceed: () => (overlay?.querySelector('[data-proceed]') as HTMLElement | null)?.click(),
    report: overlay?.querySelector('.bsc-report')?.textContent ?? '',
    title: overlay?.querySelector('h1')?.textContent ?? '',
  }
}

describe('browser support check', () => {
  // The guard exists to reach browsers that cannot run the bundle, so it must
  // parse on them too — modern syntax here would throw before it can warn.
  it('parses as ES5', () => {
    expect(() => parse(SCRIPT, { ecmaVersion: 5 })).not.toThrow()
  })

  it('stays out of the way on a supported browser', () => {
    expect(setup().overlay).toBeNull()
  })

  it('blocks a browser without color-mix', () => {
    const { overlay, report } = setup({ hasColorMix: false })
    expect(overlay).not.toBeNull()
    expect(report).toContain('Unsupported: css-color-mix')
  })

  it('blocks a browser without structuredClone', () => {
    expect(setup({ hasStructuredClone: false }).overlay).not.toBeNull()
  })

  // Both are polyfilled by app/plugins/polyfill.ts, so they must only ever be
  // reported, never enforced.
  it('reports polyfilled gaps as degraded rather than blocking', () => {
    const { report } = setup({ hasColorMix: false })
    expect(report).toContain('Degraded: ')
    expect(report).not.toContain('Unsupported: js-array-at')
  })

  it('reports the details CS needs', () => {
    const { report } = setup({ hasColorMix: false })
    expect(report).toContain('Page: https://3ook.com/en/store')
    expect(report).toContain('User agent: ')
    expect(report).toContain('Build: ')
  })

  it('honours the skipBrowserCheck escape hatch', () => {
    const skipped = setup({ hasColorMix: false, url: 'https://3ook.com/en/store?skipBrowserCheck' })
    expect(skipped.overlay).toBeNull()
    // A lookalike query value must not disable it.
    const notSkipped = setup({ hasColorMix: false, url: 'https://3ook.com/en/store?utm_content=skipBrowserCheck' })
    expect(notSkipped.overlay).not.toBeNull()
  })

  // Devices that ship WebView in firmware can never satisfy the gate, so the
  // override has to survive relaunching the app.
  it('remembers "continue anyway" across reloads on the same browser', () => {
    const first = setup({ hasColorMix: false })
    first.proceed()
    expect(first.win.document.querySelector('.bsc')).toBeNull()

    // A relaunch drops sessionStorage, so only localStorage may satisfy the gate.
    first.win.sessionStorage.clear()
    expect(first.win.localStorage.getItem('3ook-skip-browser-check')).toBe('Chrome/108.0.0.0')
    expect(setup({ hasColorMix: false, win: first.win }).overlay).toBeNull()
  })

  // The two storages drift apart when a write succeeds in one and throws in the
  // other, so a match in either has to count on its own.
  it('accepts an override in one storage while the other holds a stale agent', () => {
    const first = setup({ hasColorMix: false })
    first.proceed()
    // Stands in for a later dismissal that only sessionStorage accepted,
    // leaving localStorage behind on the agent it recorded first.
    first.win.sessionStorage.setItem('3ook-skip-browser-check', 'Chrome/120.0.0.0')

    const upgraded = setup({ hasColorMix: false, win: first.win, userAgent: 'Chrome/120.0.0.0' })
    expect(upgraded.overlay).toBeNull()
  })

  // The override expires exactly when it stops applying.
  it('restores the gate once the browser is upgraded', () => {
    const first = setup({ hasColorMix: false })
    first.proceed()

    const upgraded = setup({ hasColorMix: false, win: first.win, userAgent: 'Chrome/120.0.0.0' })
    expect(upgraded.overlay).not.toBeNull()
  })

  // The only action a blocked user can take must not sit below an expandable
  // block that pushes it off a small screen.
  it('puts the escape hatch above the technical details', () => {
    const { overlay, win } = setup({ hasColorMix: false })
    const proceed = overlay!.querySelector('[data-proceed]')!
    const details = overlay!.querySelector('.bsc-details')!
    const isDetailsAfter = proceed.compareDocumentPosition(details) & win.Node.DOCUMENT_POSITION_FOLLOWING
    expect(isDetailsAfter).toBeTruthy()
  })

  it('picks the locale from the path, falling back to the browser language', () => {
    expect(setup({ hasColorMix: false }).title).toBe('Your browser is out of date')
    expect(setup({ hasColorMix: false, url: 'https://3ook.com/store', language: 'zh-HK' }).title)
      .toBe('瀏覽器版本過舊')
    expect(setup({ hasColorMix: false, url: 'https://3ook.com/en/store', language: 'zh-HK' }).title)
      .toBe('Your browser is out of date')
  })
})
