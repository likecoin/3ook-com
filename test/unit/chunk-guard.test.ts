import { describe, expect, it, vi } from 'vitest'
import { Window } from 'happy-dom'

import {
  CHUNK_ERROR_FIRST_AT_KEY,
  CHUNK_ERROR_PATTERNS,
  CHUNK_ERROR_PREBOOT_KEY,
  CHUNK_ERROR_RELOADS_KEY,
  CHUNK_GUARD_SCRIPT,
} from '~~/shared/utils/chunk-guard'

const ENTRY_SRC = 'https://3ook.com/_nuxt/entry.ABC123.js'

interface SetupOptions {
  sw?: boolean
  nativeFeatures?: string[]
  ladderActive?: boolean
  storage?: Record<string, string>
  installTwice?: boolean
}

// Evaluates the serialized guard (the exact string injected into the SSR
// <head>) inside a fresh happy-dom window, with controllable timer/cache/SW
// stubs shadowing the globals the guard closes over.
function setup(options: SetupOptions = {}) {
  const win = new Window({
    url: 'https://3ook.com/store',
    settings: {
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
    },
  })
  const globalWin = win as unknown as Record<string, unknown>

  for (const [key, value] of Object.entries(options.storage ?? {})) {
    win.localStorage.setItem(key, value)
  }
  if (options.ladderActive) globalWin.__chunkLadderActive = true

  const swUnregister = vi.fn(async () => true)
  if (options.sw) {
    Object.defineProperty(win.navigator, 'serviceWorker', {
      value: {
        controller: {},
        getRegistrations: async () => [{ unregister: swUnregister }],
      },
      configurable: true,
    })
  }

  const postMessage = vi.fn()
  if (options.nativeFeatures) {
    globalWin.ReactNativeWebView = { postMessage }
    globalWin.__nativeBridge = { features: options.nativeFeatures }
  }

  const cacheDelete = vi.fn(async () => true)
  const cachesStub = { keys: async () => ['html-pages'], delete: cacheDelete }

  const reload = vi.fn()
  const replace = vi.fn()
  win.location.reload = reload
  win.location.replace = replace

  const timers: { fn: () => void, ms: number }[] = []
  const fakeSetTimeout = (fn: () => void, ms: number) => {
    timers.push({ fn, ms })
    return 0
  }

  const run = new Function(
    'window', 'document', 'navigator', 'localStorage', 'caches', 'setTimeout',
    CHUNK_GUARD_SCRIPT,
  )
  const install = () => run(
    win, win.document, win.navigator, win.localStorage, cachesStub, fakeSetTimeout,
  )
  install()
  if (options.installTwice) install()

  const failEntryScript = () => {
    const script = win.document.createElement('script')
    script.setAttribute('src', ENTRY_SRC)
    win.document.head.appendChild(script)
    script.dispatchEvent(new win.Event('error'))
  }
  const failLink = (href: string, rel = 'prefetch') => {
    const link = win.document.createElement('link')
    link.setAttribute('rel', rel)
    link.setAttribute('href', href)
    win.document.head.appendChild(link)
    link.dispatchEvent(new win.Event('error'))
  }
  const rejectWith = (message: string) => {
    const event = new win.Event('unhandledrejection')
    ;(event as unknown as Record<string, unknown>).reason = new Error(message)
    win.dispatchEvent(event)
  }
  const breadcrumb = () => {
    const raw = win.localStorage.getItem(CHUNK_ERROR_PREBOOT_KEY)
    return raw ? JSON.parse(raw) : null
  }

  return {
    win,
    timers,
    reload,
    replace,
    postMessage,
    swUnregister,
    cacheDelete,
    failEntryScript,
    failLink,
    rejectWith,
    breadcrumb,
  }
}

describe('CHUNK_GUARD_SCRIPT serialization', () => {
  it('is a valid standalone script with no bundler helpers', () => {
    expect(() => new Function(CHUNK_GUARD_SCRIPT)).not.toThrow()
    // Function.prototype.toString serialization breaks if the transform injects
    // helpers (e.g. esbuild keepNames) that only exist in module scope.
    expect(CHUNK_GUARD_SCRIPT).not.toContain('__name')
    expect(CHUNK_GUARD_SCRIPT).not.toContain('import ')
    // Interpolated raw into <script>…</script> — this sequence would truncate
    // the tag and break every SSR document.
    expect(CHUNK_GUARD_SCRIPT.toLowerCase()).not.toContain('</script')
  })

  it('inlines the shared localStorage keys and patterns as literals', () => {
    expect(CHUNK_GUARD_SCRIPT).toContain(CHUNK_ERROR_FIRST_AT_KEY)
    expect(CHUNK_GUARD_SCRIPT).toContain(CHUNK_ERROR_RELOADS_KEY)
    expect(CHUNK_GUARD_SCRIPT).toContain(CHUNK_ERROR_PREBOOT_KEY)
    for (const pattern of CHUNK_ERROR_PATTERNS) {
      expect(CHUNK_GUARD_SCRIPT).toContain(pattern)
    }
  })
})

describe('installChunkGuard', () => {
  it('soft-reloads on the first failure without a controlling SW', () => {
    const t = setup()
    t.failEntryScript()

    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('1')
    expect(t.breadcrumb()).toMatchObject({
      action: 'reload',
      attempt: 0,
      had_sw: false,
      native_cleared: false,
      error_message: `Failed to load ${ENTRY_SRC}`,
    })
    expect(t.timers).toHaveLength(1)
    expect(t.timers[0]!.ms).toBe(200)
    t.timers[0]!.fn()
    expect(t.reload).toHaveBeenCalledOnce()
  })

  it('skips to the purge rung when a SW controls the page', async () => {
    const t = setup({ sw: true })
    t.failEntryScript()

    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('2')
    expect(t.breadcrumb()).toMatchObject({ action: 'purge', attempt: 1, had_sw: true })
    expect(t.timers[0]!.ms).toBe(200)
    t.timers[0]!.fn()
    await vi.waitFor(() => expect(t.replace).toHaveBeenCalledOnce())
    expect(t.swUnregister).toHaveBeenCalledOnce()
    expect(t.cacheDelete).toHaveBeenCalledWith('html-pages')
    expect(t.replace.mock.calls[0]![0]).toContain('_swrefresh=')
  })

  it('requests a native clear on the purge rung when the shell supports it', () => {
    const t = setup({
      nativeFeatures: ['clearWebViewCache'],
      storage: {
        [CHUNK_ERROR_FIRST_AT_KEY]: String(Date.now()),
        [CHUNK_ERROR_RELOADS_KEY]: '1',
      },
    })
    t.failEntryScript()

    expect(t.postMessage).toHaveBeenCalledWith(JSON.stringify({ type: 'clearWebViewCache' }))
    expect(t.breadcrumb()).toMatchObject({ action: 'purge', native_cleared: true })
    // The web-side replace waits out the native wipe as a backstop.
    expect(t.timers[0]!.ms).toBe(3000)
  })

  it('surrenders with a retry banner once the ladder is exhausted', () => {
    const t = setup({
      storage: {
        [CHUNK_ERROR_FIRST_AT_KEY]: String(Date.now()),
        [CHUNK_ERROR_RELOADS_KEY]: '2',
      },
    })
    t.failEntryScript()

    expect(t.breadcrumb()).toMatchObject({ action: 'surrender', attempt: 2 })
    expect(t.timers).toHaveLength(0)
    const button = t.win.document.querySelector('button')
    expect(button?.textContent).toBe('重試 Retry')
    button!.click()
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('0')
    expect(t.reload).toHaveBeenCalledOnce()
  })

  it('restarts the ladder when the previous incident is stale', () => {
    const t = setup({
      storage: {
        [CHUNK_ERROR_FIRST_AT_KEY]: String(Date.now() - 10 * 60000),
        [CHUNK_ERROR_RELOADS_KEY]: '2',
      },
    })
    t.failEntryScript()

    expect(t.breadcrumb()).toMatchObject({ action: 'reload', attempt: 0 })
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('1')
  })

  it('recovers from matching unhandled rejections', () => {
    const t = setup()
    t.rejectWith('Importing a module script failed.')

    expect(t.breadcrumb()).toMatchObject({ action: 'reload' })
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('1')
  })

  it('ignores non-chunk failures', () => {
    const t = setup()

    const img = t.win.document.createElement('img')
    img.setAttribute('src', 'https://3ook.com/images/cover.jpg')
    t.win.document.body.appendChild(img)
    img.dispatchEvent(new t.win.Event('error'))

    const script = t.win.document.createElement('script')
    script.setAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js')
    t.win.document.head.appendChild(script)
    script.dispatchEvent(new t.win.Event('error'))

    t.rejectWith('Some unrelated failure')

    expect(t.breadcrumb()).toBeNull()
    expect(t.timers).toHaveLength(0)
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBeNull()
  })

  it('ignores blocked /_nuxt/ asset prefetches', () => {
    const t = setup()

    t.failLink('https://3ook.com/_nuxt/affiliate-cta-banner-backdrop._QrDO68Y.webp')
    t.failLink('https://3ook.com/_nuxt/entry.ABC123.css')

    expect(t.breadcrumb()).toBeNull()
    expect(t.timers).toHaveLength(0)
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBeNull()
  })

  it('still recovers when a preloaded module script is blocked', () => {
    const t = setup()
    t.failLink(ENTRY_SRC, 'modulepreload')

    expect(t.breadcrumb()).toMatchObject({ action: 'reload' })
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('1')
  })

  it('recovers when the chunk URL carries a query string', () => {
    const t = setup()
    t.failLink(`${ENTRY_SRC}?v=1`, 'modulepreload')

    expect(t.breadcrumb()).toMatchObject({ action: 'reload' })
  })

  it('stands down when the booted app owns the ladder', () => {
    const t = setup({ ladderActive: true })
    t.failEntryScript()

    expect(t.breadcrumb()).toBeNull()
    expect(t.timers).toHaveLength(0)
  })

  it('installs once even when injected twice', () => {
    const t = setup({ installTwice: true })
    t.failEntryScript()

    // A second live listener would advance the ladder twice per failure.
    expect(t.win.localStorage.getItem(CHUNK_ERROR_RELOADS_KEY)).toBe('1')
  })
})
