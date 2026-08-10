type RouteValue = string | null | undefined | (string | null)[]

function getFirstRouteValue(value: RouteValue, defaultValue: string) {
  return (Array.isArray(value) ? value[0] : value) || defaultValue
}

// Takes the route rather than reading useRoute(), so middleware can read the
// `to`/`from` it is handed.
export function getRouteParamString(
  route: { params: Record<string, RouteValue> },
  key: string,
  defaultValue = '',
) {
  return getFirstRouteValue(route.params[key], defaultValue)
}

export function useRouteQuery() {
  const route = useRoute()
  return function getRouteQuery(key: string, defaultValue = '') {
    return getFirstRouteValue(route.query[key], defaultValue)
  }
}

export function useRouteParam() {
  const route = useRoute()
  return function getRouteParam(key: string, defaultValue = '') {
    return getRouteParamString(route, key, defaultValue)
  }
}

export function useRouteBaseNameString() {
  const route = useRoute()
  const getRouteBaseName = useRouteBaseName()
  return function getRouteBaseNameString(targetRoute = route): string {
    const name = getRouteBaseName(targetRoute)
    return typeof name === 'string' ? name : ''
  }
}
