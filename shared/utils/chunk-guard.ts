// Pre-boot chunk-error guard. The recovery ladder in plugins/chunk-error.client.ts
// only exists once the Nuxt entry module has booted — if the entry chunk itself
// 404s (stale SW shell after a deploy), the page renders but never hydrates and
// nothing recovers or reports. installChunkGuard is serialized into an inline
// <head> script (see server/plugins/chunk-guard.ts), so it is part of every SSR
// document and runs before the (deferred) module entry.
//
// It must stay fully self-contained: no imports, no auto-imports, no references
// to module scope — only globals. TS annotations are fine (they compile away),
// but the localStorage keys below must be written as literals inside the
// function; a unit test keeps them in sync with the exported constants.

// Shared with plugins/chunk-error.client.ts (vueuse useLocalStorage writes plain
// stringified numbers, so both sides read/write the same values).
export const CHUNK_ERROR_FIRST_AT_KEY = 'chunk_error_first_at'
export const CHUNK_ERROR_RELOADS_KEY = 'chunk_error_reloads'
// Breadcrumb handed to the app after a successful boot for deferred telemetry.
export const CHUNK_ERROR_PREBOOT_KEY = 'chunk_error_preboot'
// Id on the surrender overlay. The guard has no boot signal of its own, so
// plugins/chunk-error.client.ts tears the banner down once the app is up.
export const CHUNK_GUARD_OVERLAY_ID = 'chunk-guard-overlay'

// Browser messages for a failed chunk/module load. Duplicated as literals
// inside installChunkGuard (self-containment); the serialization test keeps
// both copies in sync.
export const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
] as const

export interface PrebootChunkError {
  at: number
  action: 'reload' | 'purge' | 'surrender'
  attempt: number
  had_sw: boolean
  native_cleared: boolean
  error_message: string
  // The app booted before this rung fired, so the action was chosen but never
  // taken. Without it the funnel counts purges and reloads that never ran.
  stood_down: boolean
}

declare global {
  interface Window {
    // Set by plugins/chunk-error.client.ts once the in-app ladder owns recovery;
    // the inline guard stands down when present.
    __chunkLadderActive?: boolean
    // Set by the inline guard itself so a double injection installs once.
    __chunkGuardInstalled?: boolean
  }
}

// shared/ is compiled without the DOM lib (it must stay server-safe), and this
// is the one file here that is browser-only by design — it runs inline in
// <head>. Declare the globals the guard touches minimally, module-scoped.
interface GuardElement {
  tagName?: string
  textContent: string | null
  src?: string
  href?: string
  setAttribute(name: string, value: string): void
  appendChild(child: GuardElement): void
  addEventListener(type: string, listener: () => void): void
}
interface GuardListenerEvent {
  target?: unknown
  reason?: unknown
}
declare const window: {
  __chunkGuardInstalled?: boolean
  __chunkLadderActive?: boolean
  ReactNativeWebView?: { postMessage(message: string): void }
  __nativeBridge?: { features?: readonly string[] }
  location: { href: string, reload(): void, replace(url: string): void }
  addEventListener(
    type: string,
    listener: (event: GuardListenerEvent) => void,
    capture?: boolean,
  ): void
}
declare const document: {
  createElement(tagName: string): GuardElement
  body: GuardElement | null
  documentElement: GuardElement
}
declare const navigator: {
  serviceWorker?: {
    controller: unknown
    getRegistrations(): Promise<{ unregister(): unknown }[]>
  }
}
declare const localStorage: {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
declare const caches: {
  keys(): Promise<string[]>
  delete(key: string): Promise<unknown>
} | undefined
declare const URL: new (url: string) => {
  searchParams: { set(key: string, value: string): void }
  toString(): string
}
declare function setTimeout(fn: () => void, ms: number): number

export function installChunkGuard(): void {
  try {
    if (window.__chunkGuardInstalled) return
    window.__chunkGuardInstalled = true

    const PATTERNS = [
      'Failed to fetch dynamically imported module',
      'error loading dynamically imported module',
      'Importing a module script failed',
    ]
    const INCIDENT_WINDOW_MS = 5 * 60000
    const RELOAD_FLUSH_DELAY_MS = 200
    // Same backstop as the plugin: give a requested native wipe time to tear
    // this page down before the web-side replace fires.
    const NATIVE_CLEAR_FALLBACK_MS = 3000
    let handled = false

    // Recovery is scheduled, not immediate, and the app often boots inside that
    // window. Once it has, the plugin owns the ladder (see recover below) and a
    // reload or cache wipe would only disrupt a page that already healed.
    const hasBooted = (): boolean => !!window.__chunkLadderActive

    const readNumber = (key: string): number => {
      try {
        return Number(localStorage.getItem(key)) || 0
      }
      catch {
        return 0
      }
    }
    const write = (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value)
      }
      catch {
        // Storage unavailable — recovery still runs, just without throttling.
      }
    }

    const showRetryBanner = (): void => {
      const overlay = document.createElement('div')
      overlay.setAttribute('id', 'chunk-guard-overlay')
      overlay.setAttribute(
        'style',
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'padding:32px;background:#f9f9f9;color:#131313;'
        + 'font-family:system-ui,sans-serif;text-align:center;',
      )
      const title = document.createElement('p')
      title.textContent = '載入失敗 Failed to load'
      title.setAttribute('style', 'font-size:18px;font-weight:600;margin:0 0 24px;')
      const button = document.createElement('button')
      button.textContent = '重試 Retry'
      button.setAttribute(
        'style',
        'padding:12px 24px;border:0;border-radius:24px;'
        + 'background:#131313;color:#f9f9f9;font-size:15px;font-weight:600;',
      )
      button.addEventListener('click', () => {
        write('chunk_error_reloads', '0')
        window.location.reload()
      })
      overlay.appendChild(title)
      overlay.appendChild(button)
      ;(document.body || document.documentElement).appendChild(overlay)
    }

    const recover = (message: string): void => {
      // Once Nuxt has booted, its chunk-error plugin owns recovery.
      if (handled || hasBooted()) return
      handled = true

      const now = Date.now()
      // Same incident-window semantics and keys as plugins/chunk-error.client.ts.
      if (now - readNumber('chunk_error_first_at') > INCIDENT_WINDOW_MS) {
        write('chunk_error_first_at', String(now))
        write('chunk_error_reloads', '0')
      }
      const attempt = readNumber('chunk_error_reloads')
      // Synchronous approximation of the plugin's async registration check: a
      // controlling SW re-serves the stale shell, so skip the soft-reload rung.
      const hadSW = !!(navigator.serviceWorker && navigator.serviceWorker.controller)
      const effectiveAttempt = hadSW && attempt === 0 ? 1 : attempt

      const record = (
        action: PrebootChunkError['action'],
        nativeCleared: boolean,
        stoodDown?: boolean,
      ): void => {
        write('chunk_error_preboot', JSON.stringify({
          at: now,
          action,
          attempt: effectiveAttempt,
          had_sw: hadSW,
          native_cleared: nativeCleared,
          error_message: message.slice(0, 100),
          stood_down: !!stoodDown,
        }))
      }

      // The app booted while this rung was pending. Give the ladder position
      // back so a later failure still gets a real attempt, and mark the
      // breadcrumb so telemetry doesn't credit an action that never ran.
      const standDown = (action: PrebootChunkError['action'], nativeCleared: boolean): void => {
        write('chunk_error_reloads', String(effectiveAttempt))
        record(action, nativeCleared, true)
      }

      if (effectiveAttempt >= 2) {
        // Reload and purge both failed — stop looping and leave the user an
        // actionable retry instead of a dead page.
        record('surrender', false)
        showRetryBanner()
        return
      }

      write('chunk_error_reloads', String(effectiveAttempt + 1))

      if (effectiveAttempt >= 1) {
        // Mirror the plugin's purge rung: ask the native shell to wipe the
        // WKWebView SW registration + caches it owns (it reloads once done),
        // purge what the web layer can reach, and keep the cache-busted
        // replace as the backstop.
        const rnw = window.ReactNativeWebView
        const features = window.__nativeBridge && window.__nativeBridge.features
        let nativeClearRequested = false
        if (rnw && Array.isArray(features) && features.indexOf('clearWebViewCache') !== -1) {
          nativeClearRequested = true
          rnw.postMessage(JSON.stringify({ type: 'clearWebViewCache' }))
        }
        record('purge', nativeClearRequested)
        setTimeout(() => {
          if (hasBooted()) {
            standDown('purge', nativeClearRequested)
            return
          }
          const purge = async (): Promise<void> => {
            try {
              const regs = navigator.serviceWorker
                ? await navigator.serviceWorker.getRegistrations()
                : []
              await Promise.all(regs.map(r => r.unregister()))
              const cacheStore = typeof caches === 'undefined' ? null : caches
              if (cacheStore) {
                const keys = await cacheStore.keys()
                await Promise.all(keys.map(k => cacheStore.delete(k)))
              }
            }
            catch {
              // Best effort — the cache-busted replace below still helps.
            }
            // No second stand-down check here: past this point the worker is
            // unregistered and the caches are gone, and only a fresh load
            // re-registers. Bailing would strand the page with neither.
            const url = new URL(window.location.href)
            url.searchParams.set('_swrefresh', String(now))
            window.location.replace(url.toString())
          }
          purge()
        }, nativeClearRequested ? NATIVE_CLEAR_FALLBACK_MS : RELOAD_FLUSH_DELAY_MS)
        return
      }

      // First error with no controlling SW: a plain reload refetches from network.
      record('reload', false)
      setTimeout(() => {
        if (hasBooted()) {
          standDown('reload', false)
          return
        }
        window.location.reload()
      }, RELOAD_FLUSH_DELAY_MS)
    }

    window.addEventListener('error', (event) => {
      // Resource load errors don't bubble — this listener is capture-phase.
      // Runtime JS errors target window; only element load failures matter here.
      const target = event.target as GuardElement | null | undefined
      if (!target || (target as unknown) === window) return
      const tagName = target.tagName
      if (tagName !== 'SCRIPT' && tagName !== 'LINK') return
      const src = target.src || target.href || ''
      if (src.indexOf('/_nuxt/') === -1) return
      // Nuxt prefetches build images, CSS and fonts from /_nuxt/ as <link> too,
      // and blockers eat names like "affiliate"/"banner". Only a failed JS
      // module leaves the page unhydrated — the rest must not purge the SW.
      const isScriptAsset = /\.m?js($|[?#])/.test(src)
      if (!isScriptAsset) return
      recover('Failed to load ' + src)
    }, true)

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const message = String(
        (reason && typeof reason === 'object' && 'message' in reason
          ? (reason as { message: unknown }).message
          : reason) || '',
      )
      if (!PATTERNS.some(pattern => message.indexOf(pattern) !== -1)) return
      recover(message)
    })
  }
  catch {
    // The guard must never break the page it exists to rescue.
  }
}

// Inline-injectable form. Function.prototype.toString of the transpiled function
// must stay free of bundler helpers — the unit test evals this string to verify.
export const CHUNK_GUARD_SCRIPT = `(${installChunkGuard.toString()})();`

export function readPrebootChunkError(): PrebootChunkError | null {
  try {
    const raw = localStorage.getItem(CHUNK_ERROR_PREBOOT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return typeof (parsed as PrebootChunkError).action === 'string'
      ? parsed as PrebootChunkError
      : null
  }
  catch {
    return null
  }
}

export function clearPrebootChunkError(): void {
  try {
    localStorage.removeItem(CHUNK_ERROR_PREBOOT_KEY)
  }
  catch {
    // Ignore — worst case the breadcrumb re-reports next session.
  }
}
