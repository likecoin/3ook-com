export default defineNuxtPlugin(async () => {
  // Don't load mini app SDK if not in a mini app environment
  // https://github.com/farcasterxyz/miniapps/blob/9edfb783f40ce1b2504bfdf2e2f2e15815541771/packages/miniapp-sdk/src/sdk.ts#L35
  if (import.meta.client && window && (!!window.ReactNativeWebView || window !== window.parent)) {
    try {
      const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk')
      await farcasterSdk.actions.ready()
    }
    catch (error) {
      console.error('Failed to initialize Farcaster mini app SDK:', error)
    }
  }
})
