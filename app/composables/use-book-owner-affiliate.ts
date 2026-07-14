import { getAffiliateVoicesForBook } from './use-plus-affiliate'
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

export function useBookOwnerAffiliate(
  nftClassId: MaybeRefOrGetter<string | undefined>,
) {
  const { user } = useUserSession()
  const queryCache = useQueryCache()
  const bookstoreStore = useBookstoreStore()

  const nftClassIdRef = computed(() => toValue(nftClassId) || '')
  // Use the bookstore-listing owner wallet (the lister) so the displayed voices
  // match exactly what the server grants — it gates on the same `ownerWallet`.
  const ownerWallet = computed(() =>
    bookstoreStore.getBookstoreInfoByNFTClassId(nftClassIdRef.value)?.ownerWallet || '')

  const loadedConfig = useState<AffiliatePublicConfig | null>('book-owner-affiliate-config', () => null)
  const loadedLikerId = useState<string | null>('book-owner-affiliate-loaded-liker-id', () => null)
  const isLoading = useState<boolean>('book-owner-affiliate-loading', () => false)

  // fetchConfig below drives the fetch (it chains the /affiliate call off the
  // resolved liker id), so this observer only mirrors the cache.
  const ownerInfoQuery = useLikerInfoByWalletAddressQuery(ownerWallet, { enabled: false })
  const ownerLikerId = computed(() => ownerInfoQuery.data.value?.likerId)

  async function fetchConfig() {
    if (user.value?.isLikerPlus) {
      loadedConfig.value = null
      loadedLikerId.value = null
      return
    }
    const wallet = ownerWallet.value
    if (!wallet || isLoading.value) return
    isLoading.value = true
    try {
      // Read the fetch result directly: the reader computed above updates in a
      // batched microtask, so it may not have flushed right after this await.
      const info = await fetchLikerInfoByWalletAddressThroughCache(queryCache, wallet)
      const likerId = info?.likerId
      if (!likerId || loadedLikerId.value === likerId) return
      const data = await apiFetch<AffiliatePublicConfig>(`/affiliate/${encodeURIComponent(likerId)}`)
      loadedConfig.value = data?.active ? data : null
      loadedLikerId.value = likerId
    }
    catch (error) {
      console.error('[BookOwnerAffiliate] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  watchImmediate(ownerWallet, () => {
    fetchConfig()
  })

  const upsellVoices = computed(() =>
    getAffiliateVoicesForBook(loadedConfig.value, nftClassIdRef.value, ownerWallet.value))

  return {
    config: loadedConfig,
    ownerWallet,
    ownerLikerId,
    upsellVoices,
    fetchConfig,
  }
}
