// Lets staff preview a local EPUB in the reader without an account.
// Testnet only: production keeps the usual guards for `standalone=1`.
export function useStandaloneReaderMode() {
  const config = useRuntimeConfig()
  const route = useRoute()
  const getRouteBaseName = useRouteBaseName()
  const getRouteQuery = useRouteQuery()
  return computed(() => (
    !!config.public.isTestnet
    && getRouteBaseName(route) === 'reader-epub'
    && getRouteQuery('standalone') === '1'
  ))
}
