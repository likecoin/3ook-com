import type { AffiliatePublicConfig } from './use-plus-affiliate'
import { getAffiliateVoicesForBook } from './use-plus-affiliate'

export function useBookOwnerAffiliate(
  nftClassId: MaybeRefOrGetter<string | undefined>,
) {
  const { user } = useUserSession()
  const metadataStore = useMetadataStore()

  const classIdRef = computed(() => toValue(nftClassId) || '')
  const { nftClassOwnerWalletAddress } = useEVMBookInfo({ nftClassId: classIdRef })

  const config = useState<AffiliatePublicConfig | null>('book-owner-affiliate-config', () => null)
  const loadedForLikerId = useState<string | null>('book-owner-affiliate-loaded-for', () => null)
  const isLoading = useState<boolean>('book-owner-affiliate-loading', () => false)

  const ownerLikerId = computed(() => {
    const wallet = nftClassOwnerWalletAddress.value
    if (!wallet) return undefined
    return metadataStore.getLikerInfoByWalletAddress(wallet)?.likerId
  })

  async function fetchConfig() {
    if (user.value?.isLikerPlus) {
      config.value = null
      loadedForLikerId.value = null
      return
    }
    const wallet = nftClassOwnerWalletAddress.value
    if (!wallet || isLoading.value) return
    isLoading.value = true
    try {
      await metadataStore.lazyFetchLikerInfoByWalletAddress(wallet)
      const likerId = ownerLikerId.value
      if (!likerId || loadedForLikerId.value === likerId) return
      const data = await $fetch<AffiliatePublicConfig>(`/api/affiliate/${likerId}`)
      config.value = data?.active ? data : null
      loadedForLikerId.value = likerId
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

  const upsellVoices = computed(() => getAffiliateVoicesForBook(config.value, classIdRef.value))

  return {
    config,
    ownerLikerId,
    upsellVoices,
    fetchConfig,
  }
}
