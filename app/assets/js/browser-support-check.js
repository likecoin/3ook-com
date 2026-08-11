/**
 * Blocks browsers too old to render the app and shows a diagnostic for CS.
 * Inlined into <head> by nuxt.config.ts, so it runs before the bundle —
 * app/plugins/polyfill.ts cannot help a browser that never boots.
 *
 * Kept as raw ES5 rather than the toString() pattern of
 * shared/utils/chunk-guard.ts: that form is transpiled by the bundler, which
 * cannot guarantee the syntax parses on the engines this exists to catch.
 */
(function () {
  var VERSION = '__3OOK_COMMIT_SHA__'
  var SUPPORT_EMAIL = '__3OOK_SUPPORT_EMAIL__'
  var SKIP_KEY = '3ook-skip-browser-check'
  var SKIP_PARAM = 'skipBrowserCheck'
  // Written to and read from both, so an override survives either one being
  // blocked or full.
  var SKIP_STORAGES = ['localStorage', 'sessionStorage']
  // Tailwind v4's own baseline. Firefox needs 128 for @property, above the 113
  // that the blocking check below settles for.
  var MIN_VERSIONS = 'Chrome 111+ · Edge 111+ · Safari 16.4+ · Firefox 128+'

  function supportsCSS(value) {
    return typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports(value)
  }

  // Tailwind v4 emits color-mix() for every semantic colour and opacity
  // modifier, so without it the whole UI renders unstyled. structuredClone is
  // the one other hard requirement nothing polyfills.
  var BLOCKING_CHECKS = [
    { id: 'css-color-mix', test: function () { return supportsCSS('color: color-mix(in oklab, red, blue)') } },
    { id: 'js-structured-clone', test: function () { return typeof structuredClone === 'function' } },
  ]

  // Reported to CS, never enforced: these degrade the UI, and the first two are
  // already covered by app/plugins/polyfill.ts.
  var DIAGNOSTIC_CHECKS = [
    { id: 'js-array-at', test: function () { return typeof Array.prototype.at === 'function' } },
    { id: 'js-object-has-own', test: function () { return typeof Object.hasOwn === 'function' } },
    { id: 'css-at-property', test: function () { return typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function' } },
    { id: 'css-has', test: function () { return supportsCSS('selector(:has(*))') } },
    { id: 'css-nesting', test: function () { return supportsCSS('selector(&)') } },
  ]

  var TEXTS = {
    'zh-Hant': {
      title: '瀏覽器版本過舊',
      body: '此瀏覽器缺少 3ook.com 所需的功能，頁面無法正常顯示。請更新瀏覽器後再試；Android 裝置請一併更新「Android System WebView」。',
      details: '技術資料（提供給客服）',
      copy: '複製技術資料',
      copied: '已複製',
      email: '聯絡客服',
      proceed: '仍要繼續瀏覽（畫面可能無法使用）',
    },
    'en': {
      title: 'Your browser is out of date',
      body: 'This browser is missing features 3ook.com needs, so the page cannot display correctly. Please update your browser and try again. On Android, also update "Android System WebView".',
      details: 'Technical details (for customer support)',
      copy: 'Copy details',
      copied: 'Copied',
      email: 'Contact support',
      proceed: 'Continue anyway (the page may not work)',
    },
  }

  var STYLES = ''
    + '#__nuxt{display:none!important}'
    + 'body{overflow:hidden}'
    + '.bsc{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;overflow:auto;padding:24px;'
    + 'background:#f9f9f9;color:#131313;-webkit-text-size-adjust:100%;'
    + 'font:16px/1.6 system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}'
    + '.bsc-box{max-width:36em;margin:0 auto;padding:24px 0}'
    // Explicit weight and underline: Tailwind's preflight may already be
    // applied and strips both from h1/a.
    + '.bsc h1{margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3}'
    + '.bsc p{margin:0 0 16px}'
    + '.bsc a{color:#131313;text-decoration:underline}'
    + '.bsc-versions{font-weight:700}'
    + '.bsc-details{margin:24px 0;padding:12px 16px;border:1px solid #d4d4d4;border-radius:8px}'
    + '.bsc-details summary{cursor:pointer}'
    + '.bsc-report{margin:12px 0;padding:12px;overflow:auto;background:#ececec;border-radius:4px;'
    + 'font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}'
    + '.bsc-copy{margin:0 12px 0 0;padding:8px 16px;border:1px solid #131313;border-radius:999px;'
    + 'background:#fff;color:#131313;font:inherit;font-size:14px;cursor:pointer}'
    // Filled and full-contrast: on the e-ink readers that cannot update at all
    // this is the only action left, and greyscale panels swallow subtle links.
    // Overrides `.bsc a`, which is the more specific selector.
    + '.bsc a.bsc-proceed{display:inline-block;padding:10px 20px;border-radius:999px;'
    + 'background:#131313;color:#f9f9f9;font-size:15px;text-decoration:none}'

  function findMissing(checks) {
    var missing = []
    for (var i = 0; i < checks.length; i += 1) {
      var isPassed = false
      try {
        isPassed = !!checks[i].test()
      }
      catch (error) {
        isPassed = false
      }
      if (!isPassed) missing.push(checks[i].id)
    }
    return missing
  }

  function readSkip(storage) {
    try {
      return window[storage].getItem(SKIP_KEY)
    }
    catch (error) {
      return null
    }
  }

  function rememberSkip() {
    for (var i = 0; i < SKIP_STORAGES.length; i += 1) {
      try {
        window[SKIP_STORAGES[i]].setItem(SKIP_KEY, navigator.userAgent)
      }
      catch (error) {
        // Best effort — a blocked or full storage just misses the override,
        // and the other may still take it.
      }
    }
  }

  // Persist by user agent so firmware-bound WebViews (e.g. Boox) can keep the
  // override; an upgrade changes the string and expires it. Match each storage
  // separately so a stale value in one cannot mask a current one in the other.
  function isSkipRequested() {
    if (new RegExp('[?&]' + SKIP_PARAM + '(=|&|$)').test(window.location.search)) return true
    for (var i = 0; i < SKIP_STORAGES.length; i += 1) {
      if (readSkip(SKIP_STORAGES[i]) === navigator.userAgent) return true
    }
    return false
  }

  function buildReport(blocking) {
    return [
      'Page: ' + window.location.href,
      'Time: ' + new Date().toISOString(),
      'Build: ' + VERSION,
      'Unsupported: ' + blocking.join(', '),
      'Degraded: ' + (findMissing(DIAGNOSTIC_CHECKS).join(', ') || 'none'),
      'Screen: ' + screen.width + 'x' + screen.height + ' @' + (window.devicePixelRatio || 1) + 'x',
      'Language: ' + (navigator.language || 'unknown'),
      'User agent: ' + navigator.userAgent,
    ].join('\n')
  }

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // Matches how the app resolves locale: English lives under /en, everything
  // else falls back to the default locale.
  function getTexts() {
    var path = window.location.pathname
    if (path === '/en' || path.indexOf('/en/') === 0) return TEXTS.en
    return (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? TEXTS['zh-Hant'] : TEXTS.en
  }

  function injectStyles() {
    var style = document.createElement('style')
    style.appendChild(document.createTextNode(STYLES))
    document.head.appendChild(style)
    return style
  }

  function copyToClipboard(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onDone, function () {
        // Denied — the report stays on screen and selectable by hand.
      })
      return
    }
    var field = document.createElement('textarea')
    field.value = text
    document.body.appendChild(field)
    try {
      field.select()
      if (document.execCommand('copy')) onDone()
    }
    catch (error) {
      // Leave the report on screen — it stays selectable by hand.
    }
    finally {
      document.body.removeChild(field)
    }
  }

  function renderOverlay(report, styleElement) {
    var texts = getTexts()
    var overlay = document.createElement('div')
    overlay.className = 'bsc'
    overlay.innerHTML = ''
      + '<div class="bsc-box">'
      + '<h1>' + escapeHTML(texts.title) + '</h1>'
      + '<p>' + escapeHTML(texts.body) + '</p>'
      + '<p class="bsc-versions">' + escapeHTML(MIN_VERSIONS) + '</p>'
      // Above the details block: expanding that pushed the only usable action
      // off the bottom of a small e-ink screen.
      + '<p><a class="bsc-proceed" data-proceed href="#">' + escapeHTML(texts.proceed) + '</a></p>'
      + '<details class="bsc-details">'
      + '<summary>' + escapeHTML(texts.details) + '</summary>'
      + '<pre class="bsc-report">' + escapeHTML(report) + '</pre>'
      + '<p><button type="button" class="bsc-copy" data-copy>' + escapeHTML(texts.copy) + '</button>'
      + '<a data-email href="#">' + escapeHTML(texts.email) + '</a></p>'
      + '</details>'
      + '</div>'

    overlay.querySelector('[data-email]').href = 'mailto:' + SUPPORT_EMAIL
      + '?subject=' + encodeURIComponent('[3ook.com] Unsupported browser')
      + '&body=' + encodeURIComponent('\n\n---\n' + report)

    var copyButton = overlay.querySelector('[data-copy]')
    copyButton.onclick = function () {
      copyToClipboard(report, function () {
        copyButton.textContent = texts.copied
      })
    }

    overlay.querySelector('[data-proceed]').onclick = function (event) {
      event.preventDefault()
      rememberSkip()
      styleElement.parentNode.removeChild(styleElement)
      overlay.parentNode.removeChild(overlay)
    }

    document.body.appendChild(overlay)
  }

  try {
    var blocking = findMissing(BLOCKING_CHECKS)
    if (!blocking.length) return

    // Logged before the skip check: the override now outlives the session, so
    // this is all CS has left to go on once a user has dismissed the overlay.
    var report = buildReport(blocking)
    if (window.console && console.error) console.error('[3ook.com] Unsupported browser\n' + report)
    if (isSkipRequested()) return

    var styleElement = injectStyles()
    if (document.body) {
      renderOverlay(report, styleElement)
    }
    else {
      document.addEventListener('DOMContentLoaded', function () {
        renderOverlay(report, styleElement)
      }, { once: true })
    }
  }
  catch (error) {
    // Never let the guard break a page it was meant to protect.
    if (window.console && console.error) console.error('[3ook.com] Browser check failed', error)
  }
})()
