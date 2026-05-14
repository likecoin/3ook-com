import { WagmiPlugin, type Config } from '@wagmi/vue'
import { reconnect } from '@wagmi/core'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineNuxtPlugin } from 'nuxt/app'

import { createWagmiConfig } from '../../wagmi'

// NOTE: Possibly will move to @wagmi/vue/nuxt nitro plugin
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const { isApp } = useAppDetection()
  const wagmiConfig = createWagmiConfig({
    apiKey: config.public.magicLinkAPIKey,
    customLogoURL: config.public.magicLinkCustomLogoURL,
    walletConnectProjectId: config.public.walletConnectProjectId,
    customRpcUrl: config.public.customRpcUrl,
    isServer: !!nuxtApp.ssrContext,
    isTestnet: !!config.public.isTestnet,
    isApp: isApp.value,
  })
  nuxtApp.vueApp
    .use(WagmiPlugin, { config: wagmiConfig as Config, reconnectOnMount: false })
    .use(VueQueryPlugin, {})

  // Avoid wagmi's default reconnectOnMount, which probes every connector —
  // including walletConnect, which lazy-loads a ~451 KB chunk. Instead,
  // reconnect only to the connector the user last used, deferred to an idle
  // window so it stays off the hydration critical path.
  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      const reconnectLastUsed = async () => {
        try {
          const recentId = await wagmiConfig.storage?.getItem('recentConnectorId')
          if (!recentId) return
          const connector = wagmiConfig.connectors.find(c => c.id === recentId)
          if (!connector) return
          await reconnect(wagmiConfig, { connectors: [connector] })
        }
        catch (error) {
          console.warn('[wagmi] Failed to reconnect last used connector', error)
        }
      }
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(reconnectLastUsed, { timeout: 2000 })
      }
      else {
        setTimeout(reconnectLastUsed, 0)
      }
    })
  }

  return {
    provide: {
      wagmiConfig,
    },
  }
})
