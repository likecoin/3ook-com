export function useTTSQueryParam() {
  const route = useRoute()
  const router = useRouter()

  const isTTSQueryParam = computed(() => route.query.tts === '1')

  function setTTSQueryParam(value: boolean) {
    const hasAlreadySet = isTTSQueryParam.value
    if (value === hasAlreadySet) return
    const query = { ...route.query }
    if (value) {
      query.tts = '1'
    }
    else {
      delete query.tts
    }
    router.replace({ query })
  }

  return { isTTSQueryParam, setTTSQueryParam }
}
