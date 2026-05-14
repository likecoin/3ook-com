// Skip the web Intercom SDK in app — the native shell owns the chat surface
// via the WebView bridge (see useIntercom). Loading both stacks risks a
// duplicate messenger on top of the native one in builds where the bridge
// feature flag isn't yet present.
export default defineNuxtPlugin(() => {
  const { isApp } = useAppDetection()

  if (isApp.value) {
    return
  }

  useScriptIntercom({
    scriptOptions: {
      trigger: useScriptTriggerIdleTimeout({ timeout: 3000 }),
    },
  })
})
