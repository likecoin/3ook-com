import { WagmiPlugin, type Config } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineNuxtPlugin } from 'nuxt/app'

import { createWagmiConfig } from '../wagmi'

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
    .use(WagmiPlugin, { config: wagmiConfig as Config })
    .use(VueQueryPlugin, {})

  return {
    provide: {
      wagmiConfig,
    },
  }
})
