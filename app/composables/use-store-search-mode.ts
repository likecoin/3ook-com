import { FetchError } from 'ofetch'

import { getGenreI18nKey } from '~~/shared/constants/book-categories'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

// Search-mode state shared by the store.vue header and the listing body.
// All members are route/cache-backed, so double instantiation stays consistent.
export async function useStoreSearchMode() {
  const { t: $t } = useI18n()
  const getRouteQuery = useRouteQuery()
  const queryCache = useQueryCache()

  const querySearchTerm = computed(() => getRouteQuery('q', ''))
  const queryAuthorName = computed(() => getRouteQuery('author', ''))
  const queryPublisherName = computed(() => getRouteQuery('publisher', ''))
  const queryOwnerWallet = computed(() => getRouteQuery('owner_wallet', ''))
  const queryGenre = computed(() => getRouteQuery('genre', ''))
  // Normalize a stray leading `@` so it resolves the same as a bare Liker ID.
  const queryAffiliate = computed(() => normalizeLikerId(getRouteQuery('affiliate', '')))

  const ownerWalletInfoQuery = useLikerInfoByWalletAddressQuery(queryOwnerWallet)
  const ownerWalletInfo = computed(() => ownerWalletInfoQuery.data.value)
  const ownerWalletAvatarSrc = computed(() => {
    return ownerWalletInfo.value?.avatarSrc || ''
  })
  const ownerWalletDisplayName = computed(() => {
    return ownerWalletInfo.value?.displayName || ''
  })

  const affiliateInfoQuery = useLikerInfoByIdQuery(queryAffiliate)
  const affiliateInfo = computed(() => affiliateInfoQuery.data.value)
  const affiliateDisplayName = computed(() => affiliateInfo.value?.displayName || queryAffiliate.value)
  const affiliateAvatarSrc = computed(() => affiliateInfo.value?.avatarSrc || '')
  const affiliateConfig = computed(() => {
    if (!queryAffiliate.value) return null
    return getAffiliateStoreConfigByLikerIdFromCache(queryCache, queryAffiliate.value)
  })
  // Some affiliates curate books without a voice; never promise playback then.
  const affiliateHasVoices = computed(() =>
    !!(affiliateConfig.value?.active && affiliateConfig.value.customVoices?.length),
  )

  // Resolve the affiliate during SSR so the name/avatar reach the title/OG tags,
  // and a 404 renders a not-found state. useAsyncData carries the 404 boolean;
  // the helper primes the query cache so the client hydrates without refetching.
  const { data: isAffiliateLookupNotFound } = await useAsyncData(
    'store-affiliate-info',
    async () => {
      const likerId = queryAffiliate.value
      if (!likerId) return false
      try {
        await fetchLikerInfoByIdThroughCache(queryCache, likerId)
        return false
      }
      catch (error) {
        if (error instanceof FetchError && error.statusCode === 404) return true
        console.error('Failed to fetch affiliate info:', error)
        return false
      }
    },
    { watch: [queryAffiliate] },
  )
  const isAffiliateNotFound = computed(() => !!queryAffiliate.value && !!isAffiliateLookupNotFound.value)

  // Search query key for bookstore store
  const searchQuery = computed(() => {
    if (queryAffiliate.value) return `affiliate:${queryAffiliate.value}`
    if (querySearchTerm.value) return `q:${querySearchTerm.value}`
    if (queryAuthorName.value) return `author:${queryAuthorName.value}`
    if (queryPublisherName.value) return `publisher:${queryPublisherName.value}`
    if (queryOwnerWallet.value) return `owner_wallet:${queryOwnerWallet.value}`
    if (queryGenre.value) return `genre:${queryGenre.value}`
    return ''
  })

  const localizedGenreName = computed(() => {
    if (!queryGenre.value) return ''
    const i18nKey = getGenreI18nKey(queryGenre.value)
    return i18nKey ? $t(i18nKey) : queryGenre.value
  })

  const isSearchMode = computed(() => !!searchQuery.value)

  const searchModeContext = computed(() => {
    if (!isSearchMode.value) return null
    if (queryAffiliate.value) {
      // Never show an unknown Liker ID as a name.
      if (isAffiliateNotFound.value) return null
      return {
        label: affiliateDisplayName.value,
        titlePrefix: $t('store_affiliate_prefix'),
        description: affiliateHasVoices.value
          ? $t('store_page_affiliate_description', { name: affiliateDisplayName.value })
          : $t('store_page_affiliate_description_no_voice', { name: affiliateDisplayName.value }),
      }
    }
    if (querySearchTerm.value) {
      return {
        label: querySearchTerm.value,
        titlePrefix: $t('store_search_prefix'),
        description: $t('store_page_search_description', { term: querySearchTerm.value }),
      }
    }
    if (queryAuthorName.value) {
      return {
        label: queryAuthorName.value,
        titlePrefix: $t('store_author_prefix'),
        description: $t('store_page_author_description', { author: queryAuthorName.value }),
      }
    }
    if (queryPublisherName.value) {
      return {
        label: queryPublisherName.value,
        titlePrefix: $t('store_publisher_prefix'),
        description: $t('store_page_publisher_description', { publisher: queryPublisherName.value }),
      }
    }
    if (queryOwnerWallet.value) {
      const displayName = ownerWalletDisplayName.value || queryOwnerWallet.value
      return {
        label: displayName,
        titlePrefix: $t('store_owner_wallet_prefix'),
        description: $t('store_page_owner_description', { owner: displayName }),
      }
    }
    if (queryGenre.value) {
      return {
        label: localizedGenreName.value,
        titlePrefix: $t('store_genre_prefix'),
        description: $t('store_page_genre_description', { genre: localizedGenreName.value }),
      }
    }
    return null
  })

  return {
    querySearchTerm,
    queryAuthorName,
    queryPublisherName,
    queryOwnerWallet,
    queryGenre,
    queryAffiliate,
    ownerWalletInfo,
    ownerWalletAvatarSrc,
    ownerWalletDisplayName,
    affiliateInfo,
    affiliateDisplayName,
    affiliateAvatarSrc,
    affiliateConfig,
    affiliateHasVoices,
    isAffiliateNotFound,
    searchQuery,
    localizedGenreName,
    isSearchMode,
    searchModeContext,
  }
}
