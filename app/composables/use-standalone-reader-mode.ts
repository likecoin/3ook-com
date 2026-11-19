// Lets anyone preview a local EPUB in the reader without an account;
// the file is only read in the browser and never uploaded.
export function useStandaloneReaderMode() {
  const route = useRoute()
  const getRouteBaseName = useRouteBaseName()
  const getRouteQuery = useRouteQuery()
  return computed(() => (
    getRouteBaseName(route) === 'reader-epub'
    && getRouteQuery('standalone') === '1'
  ))
}
