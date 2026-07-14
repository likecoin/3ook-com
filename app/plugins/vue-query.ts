import type { DehydratedState } from '@tanstack/vue-query'
import {
  QueryClient,
  VueQueryPlugin,
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
} from '@tanstack/vue-query'

import { LIKER_INFO_QUERY_KEY } from '../composables/use-liker-info'

export default defineNuxtPlugin((nuxtApp) => {
  // Keep default client options untouched for wagmi parity;
  // our own query defaults live in the queryOptions factories.
  const queryClient = new QueryClient()
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  const vueQueryState = useState<DehydratedState | null>('vue-query', () => null)
  if (import.meta.server) {
    nuxtApp.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient, {
        // Scope the payload to liker-info queries so server-started queries from
        // other libraries (e.g. wagmi) never leak in; widen as more data migrates.
        shouldDehydrateQuery: query =>
          defaultShouldDehydrateQuery(query) && query.queryKey[0] === LIKER_INFO_QUERY_KEY,
      })
    })
  }
  if (import.meta.client && vueQueryState.value) {
    hydrate(queryClient, vueQueryState.value)
  }
})
