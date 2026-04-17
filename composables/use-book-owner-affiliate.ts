import { getAffiliateVoicesForBook } from './use-plus-affiliate'
import type { AffiliatePublicConfig } from '~/shared/types/affiliate'

export function useBookOwnerAffiliate(
  nftClassId: MaybeRefOrGetter<string | undefined>,
) {
  const { user } = useUserSession()
  const metadataStore = useMetadataStore()

  const nftClassIdRef = computed(() => toValue(nftClassId) || '')
  const { nftClassOwnerWalletAddress } = useEVMBookInfo({ nftClassId: nftClassIdRef })

  const loadedConfig = useState<AffiliatePublicConfig | null>('book-owner-affiliate-config', () => null)
  const loadedLikerId = useState<string | null>('book-owner-affiliate-loaded-liker-id', () => null)
  const isLoading = useState<boolean>('book-owner-affiliate-loading', () => false)

  const ownerLikerId = computed(() => {
    const wallet = nftClassOwnerWalletAddress.value
    if (!wallet) return undefined
    return metadataStore.getLikerInfoByWalletAddress(wallet)?.likerId
  })

  async function fetchConfig() {
    if (user.value?.isLikerPlus) {
      loadedConfig.value = null
      loadedLikerId.value = null
      return
    }
    const wallet = nftClassOwnerWalletAddress.value
    if (!wallet || isLoading.value) return
    isLoading.value = true
    try {
      await metadataStore.lazyFetchLikerInfoByWalletAddress(wallet)
      const likerId = ownerLikerId.value
      if (!likerId || loadedLikerId.value === likerId) return
      const data = await $fetch<AffiliatePublicConfig>(`/api/affiliate/${encodeURIComponent(likerId)}`)
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

  watchImmediate(nftClassOwnerWalletAddress, () => {
    fetchConfig()
  })

  const upsellVoices = computed(() => getAffiliateVoicesForBook(loadedConfig.value, nftClassIdRef.value))

  return {
    config: loadedConfig,
    ownerLikerId,
    upsellVoices,
    fetchConfig,
  }
}
