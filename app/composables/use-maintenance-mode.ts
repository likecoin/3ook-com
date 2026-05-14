const WHITELISTED_ROUTE_NAMES = [
  'about',
]

export function useMaintenanceMode() {
  const config = useRuntimeConfig()
  const getRouteQuery = useRouteQuery()
  const getRouteBaseNameString = useRouteBaseNameString()

  const shouldOverrideMaintenancePage = computed(() => {
    return getRouteQuery('maintenance') === '0'
  })

  const isWhitelistedRoute = computed(() => {
    return WHITELISTED_ROUTE_NAMES.includes(getRouteBaseNameString())
  })

  const isShowMaintenancePage = computed(() => (
    config.public.isMaintenanceMode
    && !shouldOverrideMaintenancePage.value
    && !isWhitelistedRoute.value
  ))

  return {
    isShowMaintenancePage,
  }
}
