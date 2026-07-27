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
}

// Runs the guard against a fresh happy-dom window with the feature detections
// it gates on stubbed out, mirroring how nuxt.config.ts inlines it into <head>.
function setup(options: SetupOptions = {}) {
  const {
    hasColorMix = true,
    hasStructuredClone = true,
    url = 'https://3ook.com/en/store',
    language = 'en-US',
  } = options

  const win = new Window({
    url,
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  })
  Object.defineProperty(win.navigator, 'language', { value: language, configurable: true })

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

  it('picks the locale from the path, falling back to the browser language', () => {
    expect(setup({ hasColorMix: false }).title).toBe('Your browser is out of date')
    expect(setup({ hasColorMix: false, url: 'https://3ook.com/store', language: 'zh-HK' }).title)
      .toBe('瀏覽器版本過舊')
    expect(setup({ hasColorMix: false, url: 'https://3ook.com/en/store', language: 'zh-HK' }).title)
      .toBe('Your browser is out of date')
  })
})
