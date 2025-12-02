import { WagmiPlugin, type Config } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineNuxtPlugin } from 'nuxt/app'

import { createWagmiConfig } from '../wagmi'

// NOTE: Possibly will move to @wagmi/vue/nuxt nitro plugin
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const wagmiConfig = createWagmiConfig({
    apiKey: config.public.magicLinkAPIKey,
    customLogoURL: config.public.magicLinkCustomLogoURL,
    walletConnectProjectId: config.public.walletConnectProjectId,
    isServer: !!nuxtApp.ssrContext,
    isTestnet: !!config.public.isTestnet,
  })
  nuxtApp.vueApp
    .use(WagmiPlugin, { config: wagmiConfig as Config })
    .use(VueQueryPlugin, {})

  return {
    provide: {
      wagmiConfig,
    },
  }
})
