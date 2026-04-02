import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

interface AffiliateVoiceEntry {
  data: AffiliateVoiceData | null
  fetched: boolean
}

export function useAffiliateVoice(nftClassId: MaybeRef<string>) {
  // Keyed by classId so one state bucket exists per book, and the key is
  // resolved at call time (not composable-setup time) so a Ref that updates
  // after mount still lands in the right bucket.
  const store = useState<Record<string, AffiliateVoiceEntry>>('affiliate-voice-store', () => ({}))
  const isLoading = useState<Record<string, boolean>>('affiliate-voice-loading', () => ({}))

  const affiliateVoice = computed<AffiliateVoiceData | null>(() => {
    const classId = toValue(nftClassId)
    if (!classId) return null
    return store.value[classId]?.data ?? null
  })

  async function fetchAffiliateVoice() {
    const classId = toValue(nftClassId)
    if (!classId) return
    if (store.value[classId]?.fetched || isLoading.value[classId]) return
    isLoading.value = { ...isLoading.value, [classId]: true }
    try {
      const data = await $fetch<AffiliateVoiceData | null>(`/api/user/affiliate-voice/${classId}`)
      store.value = { ...store.value, [classId]: { data, fetched: true } }
    }
    catch (error) {
      console.error('[AffiliateVoice] Failed to fetch:', error)
    }
    finally {
      isLoading.value = { ...isLoading.value, [classId]: false }
    }
  }

  return {
    affiliateVoice,
    fetchAffiliateVoice,
  }
}
