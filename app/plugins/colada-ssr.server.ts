import { useQueryCache } from '@pinia/colada'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin({
  name: 'colada-drop-ssr-error-entries',
  // 'pre' registers this app:rendered hook ahead of colada-nuxt's, which
  // snapshots the cache into the payload on the same hook.
  enforce: 'pre',
  setup(nuxtApp) {
    // Error states hold non-POJO fetcher errors (e.g. FetchError) that devalue
    // cannot serialize, which would 500 the render when colada-nuxt writes the
    // query cache into the payload. Drop them; the client refetches on mount.
    nuxtApp.hooks.hook('app:rendered', () => {
      const queryCache = useQueryCache(nuxtApp.$pinia as Pinia)
      queryCache.getEntries({ status: 'error' }).forEach(entry => queryCache.remove(entry))
    })
  },
})
