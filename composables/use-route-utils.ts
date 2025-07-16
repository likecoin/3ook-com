export function useRouteQuery() {
  const route = useRoute()
  return function getRouteQuery(key: string, defaultValue = '') {
    const value = route.query[key]
    return (Array.isArray(value) ? value[0] : value) || defaultValue
  }
}

export function useRouteParam() {
  const route = useRoute()
  return function getRouteParam(key: string, defaultValue = '') {
    const value = route.params[key]
    return (Array.isArray(value) ? value[0] : value) || defaultValue
  }
}
