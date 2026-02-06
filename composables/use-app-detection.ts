export function useAppDetection() {
  const getRouteQuery = useRouteQuery()

  const isAppUserAgent = ref(false)

  const isApp = computed(() => {
    return isAppUserAgent.value || getRouteQuery('app') === '1'
  })

  onMounted(() => {
    isAppUserAgent.value = navigator.userAgent?.startsWith('3ook-com-app') || false
  })

  return {
    isApp: readonly(isApp),
  }
}
