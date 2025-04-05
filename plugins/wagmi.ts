import { WagmiPlugin } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineNuxtPlugin } from 'nuxt/app'

import { createWagmiConfig } from '../wagmi'

// NOTE: Possibly will move to @wagmi/vue/nuxt nitro plugin
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  nuxtApp.vueApp
    .use(WagmiPlugin, {
      config: createWagmiConfig({
        apiKey: config.public.magicLinkAPIKey,
        rpcURL: config.public.magicLinkRPCURL,
        chainId: config.public.magicLinkChainId,
        customLogoURL: config.public.magicLinkCustomLogoURL,
      }),
    })
    .use(VueQueryPlugin, {})
})
