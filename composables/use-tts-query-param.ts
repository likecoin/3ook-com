export function useTTSQueryParam() {
  const route = useRoute()
  const router = useRouter()

  function setTTSQueryParam(value: boolean) {
    const alreadySet = !!route.query.tts
    if (value === alreadySet) return
    const query = { ...route.query }
    if (value) {
      query.tts = '1'
    }
    else {
      delete query.tts
    }
    router.replace({ query })
  }

  return { setTTSQueryParam }
}
