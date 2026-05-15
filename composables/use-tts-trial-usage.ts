import { useStorage } from '@vueuse/core'
import { TTS_TRIAL_CHARACTER_LIMIT } from '~/shared/utils/tts-trial'

// Module-scoped so dedup survives `useTextToSpeech` teardown when the player
// modal closes; otherwise replaying the same segment after re-open would
// double-count the same audio.
const optimisticallyCountedSegments = new Set<string>()

interface ServerUsage {
  charactersUsed: number
  limit: number
}

// Per-wallet dedup for the server floor fetch — prevents N concurrent GETs
// when multiple components mount the composable at the same time.
const inflightServerFetches = new Map<string, Promise<ServerUsage | null>>()

async function fetchServerUsage(wallet: string): Promise<ServerUsage | null> {
  const pending = inflightServerFetches.get(wallet)
  if (pending) return pending
  const task = (async (): Promise<ServerUsage | null> => {
    try {
      return await apiFetch<ServerUsage>('/reader/tts/usage')
    }
    catch (error) {
      console.warn('[TTSTrialUsage] Failed to fetch server usage:', error)
      return null
    }
    finally {
      inflightServerFetches.delete(wallet)
    }
  })()
  inflightServerFetches.set(wallet, task)
  return task
}

export function useTTSTrialUsage() {
  const { loggedIn: hasLoggedIn, user } = useUserSession()

  const wallet = computed(() => user.value?.evmWallet || '')
  const isLikerPlus = computed(() => !!user.value?.isLikerPlus)

  // Reactive key: wallet switch rebinds the ref to the new wallet's storage
  // key automatically. `anon` is a sentinel for the logged-out state — the UI
  // gates on `isLoaded`, so any writes to it are never displayed.
  const storageKey = computed(() =>
    `tts-trial-chars-${wallet.value.toLowerCase() || 'anon'}`,
  )
  const charactersUsed = useStorage<number>(storageKey, 0)
  const limit = useState<number>('tts-trial-limit', () => TTS_TRIAL_CHARACTER_LIMIT)

  const charactersRemaining = computed(() => Math.max(limit.value - charactersUsed.value, 0))
  const isExhausted = computed(() => !isLikerPlus.value && charactersUsed.value >= limit.value)
  const isLoaded = computed(() =>
    hasLoggedIn.value && (isLikerPlus.value || (import.meta.client && !!wallet.value)),
  )

  async function mergeServerUsage(targetWallet: string): Promise<void> {
    const server = await fetchServerUsage(targetWallet)
    if (server === null) return
    // Guard against wallet change while the request was in flight.
    if (wallet.value !== targetWallet) return
    if (server.limit !== limit.value) limit.value = server.limit
    if (server.charactersUsed <= charactersUsed.value) return
    charactersUsed.value = server.charactersUsed
  }

  watch([wallet, hasLoggedIn], ([newWallet, loggedIn], oldValues) => {
    const [oldWallet] = oldValues ?? []
    if (!import.meta.client) return
    if (!loggedIn || !newWallet) {
      optimisticallyCountedSegments.clear()
      return
    }
    // Clear per-wallet dedup on wallet switch so the new wallet isn't
    // suppressed by segments counted under the previous wallet.
    if (oldWallet && oldWallet !== newWallet) {
      optimisticallyCountedSegments.clear()
    }
    // Non-blocking merge: localStorage may be wiped (new device, private
    // mode, user cleared data) while the server still holds the cost
    // counter. Merging keeps the chip from understating relative to the
    // hard wall enforced by `getUserTTSAvailable`, and also picks up the
    // server-side limit so changes don't require a client deploy.
    if (!isLikerPlus.value) {
      void mergeServerUsage(newWallet)
    }
  }, { immediate: true })

  // Counts every segment the user plays (cache hit or fresh generation),
  // so the meter tracks experienced TTS — not server-side generation cost,
  // which is blind to Cloudflare/Firebase cache hits.
  function recordOptimisticSegmentUsage(dedupKey: string, charactersDelta: number): void {
    if (!import.meta.client) return
    if (!wallet.value || isLikerPlus.value) return
    if (optimisticallyCountedSegments.has(dedupKey)) return
    optimisticallyCountedSegments.add(dedupKey)
    charactersUsed.value += charactersDelta
  }

  return {
    isLoaded,
    charactersUsed,
    limit,
    charactersRemaining,
    isExhausted,
    recordOptimisticSegmentUsage,
  }
}
