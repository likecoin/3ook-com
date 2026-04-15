import type { TTSTrialUsageData } from '~/shared/types/tts'

export function useTTSTrialUsage() {
  const data = useState<TTSTrialUsageData | null>('tts-trial-usage', () => null)
  const inflightFetch = useState<Promise<void> | null>('tts-trial-usage-inflight', () => null)

  const { loggedIn: hasLoggedIn, user } = useUserSession()

  const charactersUsed = computed(() => data.value?.charactersUsed ?? 0)
  const limit = computed(() => data.value?.limit ?? 0)
  const charactersRemaining = computed(() => data.value?.charactersRemaining ?? null)
  const isExhausted = computed(() => data.value?.isExhausted ?? false)

  function fetchUsage(): Promise<void> {
    if (!hasLoggedIn.value) return Promise.resolve()
    if (user.value?.isLikerPlus) return Promise.resolve()
    if (data.value !== null) return Promise.resolve()
    if (inflightFetch.value) return inflightFetch.value
    const task = (async () => {
      try {
        const res = await $fetch<TTSTrialUsageData>('/api/reader/tts/usage')
        if (!hasLoggedIn.value) return
        data.value = res
      }
      catch (error) {
        console.error('[TTSTrialUsage] Failed to fetch:', error)
      }
      finally {
        inflightFetch.value = null
      }
    })()
    inflightFetch.value = task
    return task
  }

  function recordOptimisticUsage(charactersDelta: number): void {
    if (!data.value || data.value.isLikerPlus) return
    const newUsed = data.value.charactersUsed + charactersDelta
    const newRemaining = Math.max(data.value.limit - newUsed, 0)
    data.value = {
      ...data.value,
      charactersUsed: newUsed,
      charactersRemaining: newRemaining,
      isExhausted: newRemaining <= 0,
    }
  }

  watch(hasLoggedIn, (loggedIn, wasLoggedIn) => {
    if (!loggedIn && wasLoggedIn) {
      data.value = null
      inflightFetch.value = null
    }
  })

  return {
    charactersUsed,
    limit,
    charactersRemaining,
    isExhausted,
    fetchUsage,
    recordOptimisticUsage,
  }
}
