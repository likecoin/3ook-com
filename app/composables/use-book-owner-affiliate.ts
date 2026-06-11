import { getAffiliateVoicesForBook } from './use-plus-affiliate'
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

export function useBookOwnerAffiliate(
  nftClassId: MaybeRefOrGetter<string | undefined>,
) {
  const { user } = useUserSession()
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()

  const nftClassIdRef = computed(() => toValue(nftClassId) || '')
  // Use the bookstore-listing owner wallet (the lister) so the displayed voices
  // match exactly what the server grants — it gates on the same `ownerWallet`.
  const ownerWallet = computed(() =>
    bookstoreStore.getBookstoreInfoByNFTClassId(nftClassIdRef.value)?.ownerWallet || '')

  const loadedConfig = useState<AffiliatePublicConfig | null>('book-owner-affiliate-config', () => null)
  const loadedLikerId = useState<string | null>('book-owner-affiliate-loaded-liker-id', () => null)
  const isLoading = useState<boolean>('book-owner-affiliate-loading', () => false)

  const ownerLikerId = computed(() => {
    const wallet = ownerWallet.value
    if (!wallet) return undefined
    return metadataStore.getLikerInfoByWalletAddress(wallet)?.likerId
  })

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
      await metadataStore.lazyFetchLikerInfoByWalletAddress(wallet)
      const likerId = ownerLikerId.value
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
