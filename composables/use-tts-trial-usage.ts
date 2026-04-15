import type { TTSTrialUsageData } from '~/shared/types/tts'

export function useTTSTrialUsage() {
  const data = useState<TTSTrialUsageData | null>('tts-trial-usage', () => null)
  const inflightFetch = useState<Promise<void> | null>('tts-trial-usage-inflight', () => null)

  const { loggedIn: hasLoggedIn, user } = useUserSession()

  const isLoaded = computed(() => data.value !== null)
  const charactersUsed = computed(() => data.value?.charactersUsed ?? 0)
  const limit = computed(() => data.value?.limit ?? 0)
  const charactersRemaining = computed(() => data.value?.charactersRemaining ?? null)
  const isExhausted = computed(() => data.value?.isExhausted ?? false)

  function fetchUsage(): Promise<void> {
    // Client-only: SSR fetch would hit Firestore for data that's consumed
    // only in client-side analytics payloads, and a pending Promise cannot
    // round-trip through the SSR payload into inflightFetch.
    if (!import.meta.client) return Promise.resolve()
    if (!hasLoggedIn.value || user.value?.isLikerPlus || data.value !== null) {
      return Promise.resolve()
    }
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
    if (!data.value || data.value.isLikerPlus || user.value?.isLikerPlus) return
    const newUsed = data.value.charactersUsed + charactersDelta
    const newRemaining = Math.max(data.value.limit - newUsed, 0)
    data.value = {
      ...data.value,
      charactersUsed: newUsed,
      charactersRemaining: newRemaining,
      isExhausted: newRemaining <= 0,
    }
  }

  watch([hasLoggedIn, () => user.value?.isLikerPlus], () => {
    if (!hasLoggedIn.value || user.value?.isLikerPlus) {
      data.value = null
      inflightFetch.value = null
      return
    }
    if (data.value === null) {
      void fetchUsage()
    }
  })

  return {
    isLoaded,
    charactersUsed,
    limit,
    charactersRemaining,
    isExhausted,
    fetchUsage,
    recordOptimisticUsage,
  }
}
