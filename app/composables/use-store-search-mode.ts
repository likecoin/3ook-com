import { FetchError } from 'ofetch'

import { getGenreI18nKey } from '~~/shared/constants/book-categories'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

// Search-mode state shared by the store.vue header and the listing body.
// All members are route/cache-backed, so double instantiation stays consistent.
export async function useStoreSearchMode() {
  const { t: $t } = useI18n()
  const getRouteQuery = useRouteQuery()
  const getRouteParam = useRouteParam()
  const queryCache = useQueryCache()

  const querySearchTerm = computed(() => getRouteQuery('q', ''))
  const queryAuthorName = computed(() => getRouteQuery('author', ''))
  const queryPublisherName = computed(() => getRouteQuery('publisher', ''))
  const queryOwnerWallet = computed(() => getRouteQuery('owner_wallet', ''))
  const queryGenre = computed(() => getRouteQuery('genre', ''))
  // Normalize a stray leading `@` so it resolves the same as a bare Liker ID.
  const queryAffiliate = computed(() => normalizeLikerId(getRouteQuery('affiliate', '')))
  // `/store/@<likerId>`: the `@` is literal in the route path, so the param
  // arrives bare — normalize anyway for a hand-typed `/store/@@id`.
  const paramUserId = computed(() => normalizeLikerId(getRouteParam('userId', '')))
  // A publisher subdomain serves the same storefront at its root, where the host
  // names the publisher and the path carries no param.
  const subdomainLikerId = usePublisherSubdomainLikerId()
  const routeUserId = computed(() => paramUserId.value || subdomainLikerId)

  // The publisher route and `?affiliate=` name the same profile, so one lookup
  // serves both; the route form is the canonical URL for that profile.
  const profileLikerId = computed(() => routeUserId.value || queryAffiliate.value)

  const profileInfoQuery = useLikerInfoByIdQuery(profileLikerId)
  const profileInfo = computed(() => profileInfoQuery.data.value)
  const profileDisplayName = computed(() => profileInfo.value?.displayName || profileLikerId.value)
  const profileAvatarSrc = computed(() => profileInfo.value?.avatarSrc || '')

  // Resolve the profile during SSR so the name/avatar reach the title/OG tags,
  // and a 404 renders a not-found state. The helpers prime the query cache so
  // the client hydrates without refetching.
  const { data: profileLookupData } = await useAsyncData(
    'store-profile-info',
    async () => {
      const likerId = profileLikerId.value
      const ownerWalletQuery = queryOwnerWallet.value
      // A bare `?owner_wallet=` still resolves its profile server-side: the
      // canonical link and header name are read by crawlers, not just by the
      // client-gated wallet query.
      if (!likerId) {
        if (!ownerWalletQuery) return null
        const info = await fetchLikerInfoByWalletAddressThroughCache(queryCache, ownerWalletQuery)
          .catch(() => undefined)
        return {
          likerId: '',
          ownerWalletQuery,
          isNotFound: false,
          resolvedLikerId: info?.likerId || '',
          evmWallet: '',
          isAffiliateActive: false,
        }
      }

      // The config decides whether the publisher route lists a curated
      // storefront or the profile's own books. It is a per-request cache miss
      // by design (always stale), so reuse an entry the sibling instantiation
      // of this composable already fetched instead of paying for it twice.
      const cachedConfig = getAffiliateStoreConfigByLikerIdFromCache(queryCache, likerId)
      try {
        const [info, config] = await Promise.all([
          fetchLikerInfoByIdThroughCache(queryCache, likerId),
          routeUserId.value && !cachedConfig
            ? fetchAffiliateStoreConfigThroughCache(queryCache, likerId).catch(() => null)
            : cachedConfig,
        ])
        return {
          likerId,
          ownerWalletQuery,
          isNotFound: false,
          resolvedLikerId: likerId,
          evmWallet: info?.evmWallet || '',
          isAffiliateActive: !!config?.active,
        }
      }
      catch (error) {
        const isNotFound = error instanceof FetchError && error.statusCode === 404
        if (!isNotFound) console.error('Failed to fetch store profile info:', error)
        return {
          likerId,
          ownerWalletQuery,
          isNotFound,
          resolvedLikerId: '',
          evmWallet: '',
          isAffiliateActive: false,
        }
      }
    },
    { watch: [profileLikerId, queryOwnerWallet] },
  )

  // useAsyncData keeps the previous result while refreshing, so a client-side
  // hop between publishers would otherwise read the outgoing profile. Gate once
  // here rather than at each consumer.
  const profileLookup = computed(() => {
    const data = profileLookupData.value
    if (!data) return null
    if (data.likerId !== profileLikerId.value) return null
    if (data.ownerWalletQuery !== queryOwnerWallet.value) return null
    return data
  })

  const isProfileNotFound = computed(() => !!profileLikerId.value && !!profileLookup.value?.isNotFound)

  // On /store/@<id> the curated storefront wins when the Liker ID has an active
  // affiliate config; otherwise the page lists what that profile published.
  // `?affiliate=` names the curated view outright, so it stays curated even when
  // the config is inactive — that URL has no other listing to fall back to.
  const isProfileCurated = computed(() => (
    routeUserId.value
      ? !!profileLookup.value?.isAffiliateActive
      : !!queryAffiliate.value
  ))

  // One curated-storefront identity and one owner-wallet identity, whichever
  // URL form named them — everything downstream reads these, not the raw params.
  const affiliateLikerId = computed(() => (isProfileCurated.value ? profileLikerId.value : ''))
  const ownerWallet = computed(() => {
    if (queryOwnerWallet.value) return queryOwnerWallet.value
    if (routeUserId.value && !isProfileCurated.value) return profileLookup.value?.evmWallet || ''
    return ''
  })

  const ownerWalletInfoQuery = useLikerInfoByWalletAddressQuery(ownerWallet)
  const ownerWalletInfo = computed(() => ownerWalletInfoQuery.data.value)
  const ownerWalletAvatarSrc = computed(() => {
    return ownerWalletInfo.value?.avatarSrc || ''
  })
  const ownerWalletDisplayName = computed(() => {
    return ownerWalletInfo.value?.displayName || ''
  })

  const affiliateConfig = computed(() => {
    if (!affiliateLikerId.value) return null
    return getAffiliateStoreConfigByLikerIdFromCache(queryCache, affiliateLikerId.value)
  })
  // Some affiliates curate books without a voice; never promise playback then.
  const affiliateHasVoices = computed(() =>
    !!(affiliateConfig.value?.active && affiliateConfig.value.customVoices?.length),
  )

  // Search query key for bookstore store
  const searchQuery = computed(() => {
    if (affiliateLikerId.value) return `affiliate:${affiliateLikerId.value}`
    if (querySearchTerm.value) return `q:${querySearchTerm.value}`
    if (queryAuthorName.value) return `author:${queryAuthorName.value}`
    if (queryPublisherName.value) return `publisher:${queryPublisherName.value}`
    if (ownerWallet.value) return `owner_wallet:${ownerWallet.value}`
    if (queryGenre.value) return `genre:${queryGenre.value}`
    return ''
  })

  const localizedGenreName = computed(() => {
    if (!queryGenre.value) return ''
    const i18nKey = getGenreI18nKey(queryGenre.value)
    return i18nKey ? $t(i18nKey) : queryGenre.value
  })

  // The publisher route is an entity listing throughout, including before its
  // profile resolves and when the Liker ID turns out not to exist — otherwise
  // an unresolved id would fall through to the default tag listing.
  const isSearchMode = computed(() => !!routeUserId.value || !!searchQuery.value)

  // A Liker ID that resolves but has neither a curated storefront nor an EVM
  // wallet has nothing to list — a legacy profile that never migrated to Base.
  // Distinct from not-found: without this the listing waits on a fetch that
  // never runs.
  const isProfileListingEmpty = computed(() =>
    !!routeUserId.value
    && !!profileLookup.value
    && !isProfileNotFound.value
    && !searchQuery.value,
  )

  // The identity chip in the store.vue header. Both URL forms and both listing
  // modes resolve to one shape, so the header renders a single block.
  const storeEntity = computed(() => {
    if (profileLikerId.value) {
      // Never show an unknown Liker ID as a name.
      if (isProfileNotFound.value) return null
      return {
        displayName: profileDisplayName.value,
        avatarSrc: profileAvatarSrc.value,
        titlePrefix: isProfileCurated.value
          ? $t('store_affiliate_prefix')
          : $t('store_owner_wallet_prefix'),
        isCurated: isProfileCurated.value,
      }
    }
    if (ownerWallet.value) {
      return {
        displayName: ownerWalletDisplayName.value || ownerWallet.value,
        avatarSrc: ownerWalletAvatarSrc.value,
        titlePrefix: $t('store_owner_wallet_prefix'),
        isCurated: false,
      }
    }
    return null
  })

  const searchModeContext = computed(() => {
    if (!isSearchMode.value) return null
    if (storeEntity.value) {
      const { displayName, titlePrefix, isCurated } = storeEntity.value
      let description = $t('store_page_owner_description', { owner: displayName })
      if (isCurated) {
        description = affiliateHasVoices.value
          ? $t('store_page_affiliate_description', { name: displayName })
          : $t('store_page_affiliate_description_no_voice', { name: displayName })
      }
      return { label: displayName, titlePrefix, description }
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
    if (queryGenre.value) {
      return {
        label: localizedGenreName.value,
        titlePrefix: $t('store_genre_prefix'),
        description: $t('store_page_genre_description', { genre: localizedGenreName.value }),
      }
    }
    return null
  })

  // The Liker ID whose /store/@<id> page this listing should canonicalize to.
  // Empty on the route form (already canonical) and when nothing resolves.
  const canonicalProfileLikerId = computed(() => {
    // Not routeUserId: that is truthy on the branded root too, and the root is a
    // second address for the storefront rather than the canonical one.
    if (paramUserId.value) return ''
    if (subdomainLikerId) return isProfileNotFound.value ? '' : subdomainLikerId
    if (queryAffiliate.value) return isProfileNotFound.value ? '' : queryAffiliate.value
    if (queryOwnerWallet.value) return profileLookup.value?.resolvedLikerId || ownerWalletInfo.value?.likerId || ''
    return ''
  })

  return {
    querySearchTerm,
    queryAuthorName,
    queryPublisherName,
    queryOwnerWallet,
    queryGenre,
    queryAffiliate,
    routeUserId,
    profileDisplayName,
    profileAvatarSrc,
    isProfileNotFound,
    isProfileListingEmpty,
    affiliateLikerId,
    ownerWallet,
    ownerWalletInfo,
    affiliateConfig,
    affiliateHasVoices,
    canonicalProfileLikerId,
    searchQuery,
    localizedGenreName,
    isSearchMode,
    storeEntity,
    searchModeContext,
  }
}
