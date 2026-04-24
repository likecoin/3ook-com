export default defineNuxtPlugin(() => {
  const { isApp } = useAppDetection()

  if (!isApp.value) {
    return
  }

  // When the native Intercom bridge is supported, defang the web SDK so
  // any stray window.Intercom(...) call becomes a no-op and can't open a
  // duplicate web messenger on top of the native one — useIntercom()
  // routes through the WebView bridge instead. Older app builds without
  // the bridge keep the web SDK active (identity + events still flow);
  // the CSS hide below keeps the launcher invisible.
  if (isNativeIntercomAvailable()) {
    const noop = () => {}
    ;(window as unknown as { Intercom: (...args: unknown[]) => void }).Intercom = noop
  }

  // Hide certain Intercom UI elements via CSS in case it loads later
  const styleId = 'intercom-visibility-overrides'
  if (document.getElementById(styleId)) {
    return
  }

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .intercom-launcher-frame,
    .intercom-launcher-badge-frame,
    .intercom-lightweight-app,
    .intercom-lightweight-app-launcher,
    .intercom-messenger-frame,
    [name="intercom-notification-stack-frame"],
    [class^="intercom-with-namespace-"]:not([name="intercom-banner-frame"]) {
      display: none !important;
    }
  `
  document.head.appendChild(style)
})
