import posthog, { type ConfigDefaults } from 'posthog-js'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((_) => {
  const runtimeConfig = useRuntimeConfig()
  const posthogClient = posthog.init(runtimeConfig.public.posthogPublicKey, {
    api_host: runtimeConfig.public.posthogHost,
    defaults: runtimeConfig.public.posthogDefaults as ConfigDefaults,
    person_profiles: 'identified_only',
    loaded: (posthog) => {
      if (import.meta.env.MODE === 'development') posthog.debug()
    },
  })

  // Make sure that pageviews are captured with each route change
  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture('$pageview', {
      current_url: to.fullPath,
    })
  })

  return {
    provide: {
      posthog: () => posthogClient,
    },
  }
})
