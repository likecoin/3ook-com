<template>
  <div class="relative">
    <!-- Alerts section, don't put them in <main/> -->
    <section
      v-if="isStoreIntroBannerVisible || isLibraryIntroBannerVisible || isAffiliateCTAVisible || isWelcomeBannerVisible"
      class="section-container flex flex-col gap-2"
    >
      <StoreIntroBanner v-if="isStoreIntroBannerVisible" />

      <LibraryIntroBanner v-if="isLibraryIntroBannerVisible" />

      <StoreAffiliateCTABanner
        v-if="isAffiliateCTAVisible"
        :display-name="affiliateDisplayName"
        :avatar-src="affiliateAvatarSrc"
        :subscribe-route="affiliateSubscribeRoute"
      />

      <PlusWelcomeBanner
        v-if="isWelcomeBannerVisible"
        :description="welcomeBannerDescription"
        @dismiss="handleWelcomeBannerDismiss"
      />
    </section>

    <!--
    Affiliate publisher drill-down: header chrome, not a grid section.
    The affiliate view loads only each publisher's first page,
    so link to the full owner_wallet listing.
    -->
    <section
      v-if="queryAffiliate && affiliatePublishers.length"
      class="flex flex-col items-center w-full mt-6 pb-6"
    >
      <h2
        class="mb-2 text-xl text-highlighted font-bold"
        v-text="$t('store_affiliate_publishers_label')"
      />

      <ul class="flex flex-wrap gap-2">
        <li
          v-for="publisher in affiliatePublishers"
          :key="publisher.wallet"
        >
          <PillButton
            :label="publisher.name"
            :to="localeRoute({ name: routeName, query: { owner_wallet: publisher.wallet } })"
          />
        </li>
      </ul>
    </section>

    <main class="section-container flex flex-col items-center grow pt-6 pb-16">
      <section
        v-if="entity && entityDescription"
        class="w-full mb-8 self-start text-left"
      >
        <h2
          class="text-2xl font-bold text-highlighted mb-2"
          v-text="entity.name"
        />
        <ExpandableContent>
          <p
            class="text-muted whitespace-pre-line"
            v-text="entityDescription"
          />
        </ExpandableContent>
      </section>

      <StoreListStatus
        v-if="storeListStatus"
        :status="storeListStatus"
        :route-name="routeName"
        @contact-click="handleContactUsClick"
      />

      <p
        v-if="isForYouFallbackHintVisible"
        class="w-full mb-6 text-sm text-muted text-center"
        v-text="$t('store_for_you_fallback_hint')"
      />

      <h2
        v-if="queryAffiliate && itemsCount > 0"
        class="mb-6 text-xl text-highlighted font-bold"
        v-text="$t('store_affiliate_books_label')"
      />

      <ul
        v-if="itemsCount > 0"
        :class="[
          ...gridClasses,

          'w-full',
        ]"
      >
        <BookstoreItem
          v-for="(item, index) in products.items"
          :id="item.classId"
          :key="`${tagId}-${item.classId}`"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.classId"
          :book-name="item.title"
          :book-cover-src="item.imageUrl"
          :price="item.minPrice"
          :price-override="item.minPriceInDecimalByCurrency"
          :like-rank="item.likeRank ?? 0"
          :lazy="index >= columnMax"
          :priority="index < columnMax"
          :ll-medium="llMedium"
          :should-show-plus-reading-icon="!isLibraryTab"
          :is-library="isLibraryTab"
          :tag="tagId"
          ll-source="bookstore"
          @open="handleBookstoreItemOpen"
        />
      </ul>
      <div
        v-if="hasMoreItems && itemsCount > 0"
        ref="infiniteScrollDetector"
        class="flex justify-center py-48"
      >
        <UIcon
          v-if="isLoadingMore"
          class="animate-spin"
          name="material-symbols-progress-activity"
          size="48"
        />
      </div>

      <!-- In-app browse hides the store, so point native users to the full catalogue as plain text. -->
      <p
        v-if="isApp && !isSearchMode && itemsCount > 0 && !hasMoreItems"
        class="w-full text-center text-sm text-muted py-8"
        v-text="$t('store_list_end_more_books_text')"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'

import { MAX_BOOKSTORE_PAGE_SIZE, isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'

const nuxtApp = useNuxtApp()
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseNameString = useRouteBaseNameString()
// /store and /library share this file; the route name selects the mode.
const routeName = computed(() => getRouteBaseNameString() || 'store')
const isLibraryTab = computed(() => routeName.value === 'library')
const getRouteQuery = useRouteQuery()
const runtimeConfig = useRuntimeConfig()
const bookstoreStore = useBookstoreStore()
const { user } = useUserSession()
const walletAddress = computed(() => user.value?.evmWallet?.toLowerCase())
const queryCache = useQueryCache()
const isRevalidatingNFTClassMetadata = useIsRevalidatingNFTClassMetadata()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const storePageState = useStorePageState(routeName)
const isOnline = useOnline()
const isAdultContentEnabled = useAdultContentSetting()
const { isApp } = useAppDetection()
const intercom = useIntercom()
// Effective Plus (canonical flag OR optimistic device-store entitlement) so a
// just-subscribed member isn't briefly treated as non-Plus before the webhook lands.
const { isPlusOrDevicePlus } = useDevicePlusEntitlement()

// Search-ish query params, resolved profiles, and the derived search-mode
// context are shared with the tags header in the store.vue parent route.
const {
  querySearchTerm,
  queryAuthorName,
  queryPublisherName,
  queryOwnerWallet,
  queryGenre,
  queryAffiliate,
  ownerWalletInfo,
  affiliateDisplayName,
  affiliateAvatarSrc,
  affiliateConfig,
  affiliateHasVoices,
  isAffiliateNotFound,
  searchQuery,
  isSearchMode,
  searchModeContext,
} = await useStoreSearchMode()

// Set by the post-purchase redirect (plus/success) to greet a just-subscribed member.
const queryWelcome = computed(() => getRouteQuery('welcome', ''))

// Publisher drill-down links rendered as header chrome — the affiliate view only
// loads each publisher's first page, so these point at the full owner_wallet list.
const affiliatePublisherWallets = computed(() =>
  (affiliateConfig.value?.active ? affiliateConfig.value.affiliatePublisherWallets : []))
const affiliatePublisherInfoQueries = useLikerInfosByWalletAddressesQuery(affiliatePublisherWallets)
const affiliatePublishers = computed(() => affiliatePublisherWallets.value.map((wallet, index) => ({
  wallet,
  name: affiliatePublisherInfoQueries.value[index]?.data?.displayName || shortenWalletAddress(wallet),
})))
// Gate on a real voice so we never promise narration the affiliate doesn't offer.
const isAffiliateCTAVisible = computed(() =>
  !!queryAffiliate.value && !isPlusOrDevicePlus.value && affiliateHasVoices.value,
)
const affiliateSubscribeRoute = computed(() => localeRoute({
  name: 'member',
  query: { from: `@${queryAffiliate.value}`, ll_medium: 'affiliate-store' },
}))

// Only greet actual members, so a shared/bookmarked `welcome` link can't surface
// the banner for non-subscribers.
const isWelcomeBannerVisible = computed(() => queryWelcome.value === '1' && isPlusOrDevicePlus.value)
const welcomeBannerDescription = computed(() =>
  queryAffiliate.value && affiliateHasVoices.value
    ? $t('plus_welcome_banner_affiliate_description', { name: affiliateDisplayName.value })
    : $t('plus_welcome_banner_description'),
)
function handleWelcomeBannerDismiss() {
  const { welcome: _welcome, ...query } = route.query
  navigateTo(localeRoute({ name: routeName.value, query }), { replace: true })
}

// "Organic or direct" = the bare store landing with no campaign/affiliate attribution.
// Campaign, paid, and affiliate traffic always carry one of these query params.
const STORE_INTRO_ATTRIBUTION_KEYS = [
  ...POSTHOG_ATTRIBUTION_KEYS,
  ...POSTHOG_LINK_TAG_KEYS,
  'affiliate',
  'from',
]
const hasCampaignAttribution = computed(() =>
  STORE_INTRO_ATTRIBUTION_KEYS.some(key => !!getRouteQuery(key)),
)
// Welcome a fresh organic/direct visitor on the bare store landing. Gate on mount
// and the persisted dismiss so the alerts section collapses instead of leaving an
// empty wrapper, and skip `tag` deep-links since those are category pages.
const { isDismissed: isStoreIntroBannerDismissed } = useStoreIntroBanner()
const isMounted = useMounted()
const isStoreIntroBannerVisible = computed(() =>
  isMounted.value
  && !isStoreIntroBannerDismissed.value
  && !isApp.value
  && !isLibraryTab.value
  && !isSearchMode.value
  && !isWelcomeBannerVisible.value
  && !getRouteQuery('tag')
  && !hasCampaignAttribution.value,
)

const isLibraryIntroBannerVisible = computed(() => isLibraryTab.value && !isSearchMode.value && !entity.value)

const {
  STAKING_TAG_DEFAULT,
  tagId,
  isDefaultTagId,
  isStakingTagId,
  isPopularTagId,
  isBestsellingTagId,
  isForYouTagId,
  getIsLocalHistoriesTagId,
  normalizedLocale,
  activeCMSTag,
  mapTagIdToAPIStakingSortValue,
  tagName,
} = useStoreTags({ routeName, isLibraryTab })

await callOnce(async () => {
  if (getIsLocalHistoriesTagId(tagId.value)) {
    await navigateTo(localeRoute({ name: 'local-histories' }), { replace: true })
    return
  }

  if (
    !tagId.value
    || isDefaultTagId.value
    || isStakingTagId.value
    || isForYouTagId.value
    || isBookstoreBuiltInListType(tagId.value)
  ) return

  let tag: BookstoreCMSTag | undefined
  try {
    tag = await fetchBookstoreCMSTagThroughCache(queryCache, tagId.value)
  }
  catch (error) {
    // Ignore 404 error
    if (!(error instanceof FetchError && error.statusCode === 404)) throw error
  }
  if (!tag) {
    const { tag: _tag, ...query } = route.query
    // Restore Nuxt context lost across the await before calling navigateTo/localeRoute.
    await nuxtApp.runWithContext(() => navigateTo(localeRoute({ name: routeName.value, query }), { replace: true }))
  }
})

const pageTitle = computed(() => isLibraryTab.value ? $t('library_tab_title') : $t('store_page_title'))
const pageDescription = computed(() => isLibraryTab.value ? $t('library_tab_description') : $t('store_page_description'))

const tagDescription = computed(() => {
  if (entityDescription.value) return entityDescription.value
  if (searchModeContext.value) return searchModeContext.value.description
  if (!isStakingTagId.value) {
    const cmsDescription = activeCMSTag.value?.description[normalizedLocale.value]
    if (cmsDescription) return cmsDescription
  }
  if (tagName.value) {
    return $t('store_page_tag_description', { tag: tagName.value })
  }
  return pageDescription.value
})

const canonicalURL = computed(() => {
  const baseURL = runtimeConfig.public.baseURL
  const path = route.path

  const canonicalParams = new URLSearchParams()

  if (!isDefaultTagId.value && tagId.value) {
    canonicalParams.set('tag', tagId.value)
  }

  if (querySearchTerm.value) {
    canonicalParams.set('q', querySearchTerm.value)
  }
  if (queryAuthorName.value) {
    canonicalParams.set('author', queryAuthorName.value)
  }
  if (queryPublisherName.value) {
    canonicalParams.set('publisher', queryPublisherName.value)
  }
  if (queryOwnerWallet.value) {
    canonicalParams.set('owner_wallet', queryOwnerWallet.value)
  }
  if (queryGenre.value) {
    canonicalParams.set('genre', queryGenre.value)
  }
  if (queryAffiliate.value) {
    canonicalParams.set('affiliate', queryAffiliate.value)
  }

  const queryString = canonicalParams.toString()
  return `${baseURL}${path}${queryString ? `?${queryString}` : ''}`
})

const ogTitle = computed(() => {
  if (searchModeContext.value) {
    return `${searchModeContext.value.titlePrefix}${searchModeContext.value.label} - ${pageTitle.value}`
  }
  if (tagName.value) {
    return [tagName.value, pageTitle.value].join(' - ')
  }
  return pageTitle.value
})

const ogImage = computed(() => {
  // Surface the affiliate's avatar on their curated store link when resolved.
  if (queryAffiliate.value && affiliateAvatarSrc.value) {
    return affiliateAvatarSrc.value
  }
  const tab = isLibraryTab.value ? 'library' : 'store'
  return `${runtimeConfig.public.baseURL}/images/og/${tab}.jpg`
})

const searchResults = computed<BookstoreItemList | null>(() => {
  if (isSearchMode.value) {
    const searchResults = bookstoreStore.getBookstoreSearchResultsByQuery(searchQuery.value, isLibraryTab.value)
    return {
      items: searchResults.items.map(item => ({
        ...item,
        totalStaked: 0n,
        stakerCount: 0,
      })),
      isFetchingItems: searchResults.isFetchingItems,
      hasFetchedItems: searchResults.hasFetchedItems,
      nextItemsKey: searchResults.nextItemsKey,
    }
  }
  return null
})

const cmsProducts = computed<BookstoreItemList>(() => {
  const apiSortValue = mapTagIdToAPIStakingSortValue(STAKING_TAG_DEFAULT)
  const stakingItems = bookstoreStore.getStakingBooks(apiSortValue).items
  const stakingData = stakingItems.reduce((map, item) => {
    map[item.nftClassId.toLowerCase()] = {
      totalStaked: item.totalStaked,
      stakerCount: item.stakerCount,
      likeRank: item.likeRank,
    }
    return map
  }, {} as Record<string, { totalStaked: bigint, stakerCount: number, likeRank?: number }>)

  const listingProducts = bookstoreStore.getBookstoreCMSProductsByTagId(tagId.value, isLibraryTab.value)
  const items = listingProducts.items.map((item) => {
    const stakingInfo = stakingData[item.classId?.toLowerCase() || '']
    return {
      ...item,
      totalStaked: stakingInfo?.totalStaked ?? 0n,
      stakerCount: stakingInfo?.stakerCount ?? 0,
      // `likeRank` is a stake rank linking to the staking page, so it's meaningless on
      // the reading/sales-ranked popular list and the personalized feed — suppress the
      // badge rather than mislabel it.
      likeRank: (isPopularTagId.value || isBestsellingTagId.value || isForYouTagId.value) ? 0 : (stakingInfo?.likeRank ?? 0),
    }
  })

  return {
    ...listingProducts,
    items,
  }
})

const isSearchResultEmpty = computed(() => (
  searchResults.value
  && searchResults.value.items.length === 0
  && searchResults.value.hasFetchedItems
))

function shouldFilterAdultOnly(bookstoreInfo: BookstoreInfo | null | undefined): boolean {
  return !isAdultContentEnabled.value && !!bookstoreInfo?.isAdultOnly
}

// Returns the source array when nothing was dropped. The For You gate below
// reads the query cache, so it re-runs on any cache write; a fresh array would
// then invalidate every downstream computed for an unchanged list.
function filterKeepingIdentity<T>(items: T[], getIsKept: (item: T) => boolean): T[] {
  const filtered = items.filter(getIsKept)
  return filtered.length === items.length ? items : filtered
}

// Library mode keeps only Plus-reading books. CMS/built-in listings carry the
// flag inline; staking/search items trust already-loaded BookstoreInfo, which
// the proactive revalidate in fetchTagItems self-heals if stale.
function getIsPlusReading(item: BookstoreItem): boolean {
  if (typeof item.isPlusReadingEnabled === 'boolean') return item.isPlusReadingEnabled
  const info = getBookstoreInfoByNFTClassIdFromCache(queryCache, item.classId || item.id || '')
  return !!info?.isPlusReadingEnabled
}

const baseProducts = computed<BookstoreItemList>(() => {
  if (searchResults.value && !isSearchResultEmpty.value) {
    const filtered = searchResults.value.items.filter((item) => {
      const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, item.classId || '')
      return !shouldFilterAdultOnly(bookstoreInfo)
    })
    return {
      ...searchResults.value,
      items: filtered,
    }
  }

  // Return staking books when viewing staking tag
  if (isStakingTagId.value) {
    const apiSortValue = mapTagIdToAPIStakingSortValue(tagId.value)
    const staking = bookstoreStore.getStakingBooks(apiSortValue)
    const items: BookstoreItem[] = []
    staking.items.forEach((item) => {
      const bookInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, item.nftClassId)
      if (bookInfo?.isHidden) return
      if (shouldFilterAdultOnly(bookInfo)) return
      items.push({
        id: item.nftClassId,
        classId: item.nftClassId,
        title: bookInfo?.name || '',
        imageUrl: bookInfo?.thumbnailUrl || '',
        minPrice: undefined,
        totalStaked: item.totalStaked,
        stakerCount: item.stakerCount,
        likeRank: item.likeRank,
      })
    })
    return {
      items,
      isFetchingItems: staking.isFetchingItems,
      hasFetchedItems: staking.hasFetchedItems,
      nextItemsKey: staking.nextItemsKey,
    }
  }

  let items = cmsProducts.value.items
  // Scoped to the feed: CMS tag listings come from the bookstore API, which
  // already excludes hidden books, while the feed's Airtable-sourced pools carry
  // no such flag.
  if (isForYouTagId.value) {
    items = filterKeepingIdentity(items, (item) => {
      const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, item.classId || item.id || '')
      return !bookstoreInfo?.isHidden
    })
  }
  if (!isAdultContentEnabled.value) {
    items = filterKeepingIdentity(items, item => !item.isAdultOnly)
  }
  return items === cmsProducts.value.items ? cmsProducts.value : { ...cmsProducts.value, items }
})

// Coalesce to an empty list: at the async-setup mount/hydration boundary the
// upstream chain can briefly resolve undefined, which crashed the many reads
// funnelling through products.value (.items, .nextItemsKey, …).
const EMPTY_PRODUCTS: BookstoreItemList = {
  items: [],
  isFetchingItems: false,
  hasFetchedItems: false,
  nextItemsKey: undefined,
}

const products = computed<BookstoreItemList>(() => {
  const base = baseProducts.value ?? EMPTY_PRODUCTS
  if (!isLibraryTab.value) return base
  return {
    ...base,
    items: base.items.filter(getIsPlusReading),
  }
})

const itemsCount = computed(() => products.value.items.length)
// In library mode the staking gate hides candidates until their Plus flags are
// revalidated, so keep the skeleton up while that's in flight to avoid an
// empty-state flash on cold load. Search/affiliate listings fetch only client-side
// in onMounted, so also treat the not-yet-fetched state as loading — otherwise the
// SSR/pre-hydration paint shows a blank grid with no spinner until the fetch starts.
const isLoadingInitialItems = computed(() => (
  itemsCount.value === 0
  && (
    products.value.isFetchingItems
    || (isSearchMode.value && !products.value.hasFetchedItems)
    || (isLibraryTab.value && isRevalidatingNFTClassMetadata.value)
  )
))
const hasMoreItems = computed(() => !!products.value.nextItemsKey || !!products.value.mayHaveMore || !products.value.hasFetchedItems)

// Order matters: the first matching status wins.
const storeListStatus = computed(() => {
  if (isAffiliateNotFound.value) return 'affiliate-not-found' as const
  if (isLoadingInitialItems.value) return 'loading' as const
  if (isSearchResultEmpty.value) return 'search-empty' as const
  if (itemsCount.value === 0 && !products.value.isFetchingItems && products.value.hasFetchedItems) return 'no-items' as const
  return null
})

// For You stays the signed-in default tag during a search, so gate on what is
// actually rendered: search results come from the search list, not the feed.
const isForYouFeedVisible = computed(() =>
  isForYouTagId.value && (!isSearchMode.value || isSearchResultEmpty.value),
)

// Tell a low-signal member why the personalized tab is showing the popular list.
// Requires items so the hint never renders above an error or empty state.
const isForYouFallbackHintVisible = computed(() =>
  isForYouFeedVisible.value
  && products.value.hasFetchedItems
  && itemsCount.value > 0
  && !bookstoreStore.getIsForYouPersonalized(isLibraryTab.value),
)

const itemsForStructuredData = computed(() => products.value.items.slice(0, Math.min(20, itemsCount.value)))
const structuredData = useStorePageStructuredData({
  items: itemsForStructuredData,
  canonicalURL,
  name: ogTitle,
  description: tagDescription,
})

const entity = computed(() => {
  if (queryAuthorName.value) return { type: 'Person' as const, name: queryAuthorName.value }
  if (queryPublisherName.value) return { type: 'Organization' as const, name: queryPublisherName.value }
  return null
})

function extractEntityDescription(metadataKey: 'author' | 'publisher'): string {
  for (const item of products.value.items) {
    if (!item.classId) continue
    const metadataValue = getNFTClassMetadataByIdFromCache(queryCache, item.classId)?.[metadataKey]
    if (metadataValue && typeof metadataValue === 'object') {
      const description = metadataValue.description?.trim()
      if (description) return description
    }
  }
  return ''
}

const entityDescription = computed(() => {
  if (queryAuthorName.value) return extractEntityDescription('author')
  if (queryPublisherName.value) return extractEntityDescription('publisher')
  return ''
})

const entityStructuredData = useEntityStructuredData({
  entity,
  url: canonicalURL,
  description: () => entityDescription.value || searchModeContext.value?.description,
})

useHead(() => {
  const meta = []
  const script = []

  if (isSearchResultEmpty.value || isAffiliateNotFound.value) {
    meta.push({
      name: 'robots',
      content: 'noindex, nofollow',
    })
  }

  // Add og:title
  meta.push({
    property: 'og:title',
    content: ogTitle.value,
  })

  meta.push(
    {
      property: 'og:image',
      content: ogImage.value,
    },
    {
      name: 'twitter:image',
      content: ogImage.value,
    },
  )

  const description = tagDescription.value
  if (description) {
    meta.push(
      {
        name: 'description',
        content: description,
      },
      {
        property: 'og:description',
        content: description,
      },
    )
  }

  if (itemsCount.value > 0 && !isSearchResultEmpty.value) {
    script.push({
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredData.value),
    })

    if (entityStructuredData.value) {
      script.push({
        type: 'application/ld+json',
        innerHTML: JSON.stringify(entityStructuredData.value),
      })
    }
  }

  const encodedTagId = encodeURIComponent(tagId.value)
  const listingPreloadLinks = []
  if (isStakingTagId.value) {
    // Same-origin proxy preload: the staking listing now routes through our own
    // origin (/api/store/staking-books), so priming it is safe on iOS — the
    // cross-origin indexer hop happens server-side and can't poison WKWebView's
    // NSURLSession pool the way a direct cross-origin fetch could.
    listingPreloadLinks.push({
      rel: 'preload',
      href: `/api/store/staking-books?sort_by=${mapTagIdToAPIStakingSortValue(tagId.value)}&sort_order=desc&limit=100`,
      as: 'fetch' as const,
      crossorigin: 'anonymous' as const,
      key: 'preload-staking-books',
    })
  }
  // The for-you feed is authed and `private, no-store`, so a preload can't be
  // reused by the page fetch and would only waste a request. The library scopes
  // its listing with `library=1`; preloading without it primes a different
  // response than the one the page goes on to fetch.
  else if (!isForYouTagId.value) {
    listingPreloadLinks.push({
      rel: 'preload',
      href: `/api/store/products?tag=${encodedTagId}&limit=${MAX_BOOKSTORE_PAGE_SIZE}&ts=${getTimestampRoundedToMinute()}${isLibraryTab.value ? '&library=1' : ''}`,
      as: 'fetch' as const,
      crossorigin: 'anonymous' as const,
      key: 'preload-store-products',
    })
  }
  const link = [
    {
      rel: 'canonical',
      href: canonicalURL.value,
    },
    {
      rel: 'preload',
      href: '/api/store/tags',
      as: 'fetch' as const,
      crossorigin: 'anonymous' as const,
      key: 'preload-store-tags',
    },
    ...listingPreloadLinks,
  ]

  return {
    title: ogTitle.value,
    meta,
    link,
    script,
  }
})

// Keyed on the resolved tag, not the raw query: logging in flips the store's
// default tab to For You without the URL changing, so watching the query alone
// would leave the listing on the previous tab's unfetched bucket.
const ownRouteName = routeName.value
watch(
  tagId,
  async () => {
    // /store and /library share this component, so the outgoing instance also
    // reacts to the incoming tab's default; that instance fetches on mount.
    if (routeName.value !== ownRouteName) return
    // Captured with the same intent as fetchTagItems' currentTagId: a mid-fetch
    // navigation would otherwise reset persisted state against the new tag.
    const hasTagQuery = !!route.query.tag
    // Scroll to top before the fetch: a restored listing revalidates on the way
    // in, and awaiting that first would strand the reader mid-page meanwhile.
    // Restoring a saved position still waits, since it needs the list rendered.
    if (!isSearchMode.value && !hasTagQuery) {
      storePageState.clear()
    }
    await fetchItems({ lazy: true })

    if (!isSearchMode.value) {
      storePageState.restoreScrollIfNeeded()
    }
  },
)

// The store drops the previous reader's feed on an account switch, leaving this
// page on an empty tab. Refetching here rather than in the store keeps the
// error modal and hasForYouFetchError with the surface that renders them.
watch(walletAddress, (wallet, previousWallet) => {
  if (routeName.value !== ownRouteName) return
  if (!previousWallet) return
  if (!isForYouTagId.value) return
  fetchItems({ isRefresh: true })
})

// Watch for changes in search parameters
watch([querySearchTerm, queryAuthorName, queryPublisherName, queryOwnerWallet, queryGenre, queryAffiliate], async () => {
  if (isSearchMode.value) {
    await fetchItems({ lazy: true })
  }
})

watch(ownerWalletInfo, (info) => {
  if (info?.evmWallet && queryOwnerWallet.value.toLowerCase() !== info.evmWallet.toLowerCase()) {
    navigateTo(localeRoute({
      name: routeName.value,
      query: {
        ...route.query,
        owner_wallet: info.evmWallet,
      },
    }))
  }
})

const llMedium = computed(() => {
  if (isSearchResultEmpty.value) {
    return 'search-empty-recommendation'
  }
  if (isSearchMode.value) {
    return 'search-result'
  }
  if (isForYouTagId.value) {
    return 'for-you'
  }
  return undefined
})

const hasForYouFetchError = ref(false)

function handleBookstoreItemOpen(classId: string) {
  if (!isForYouFeedVisible.value) return
  useLogRecommendBookClick({
    nftClassId: classId,
    isPersonalized: bookstoreStore.getIsForYouPersonalized(isLibraryTab.value),
    llMedium: llMedium.value,
  })
}

// A view is the feed rendered with its data resolved, which a call to fetch it
// cannot define: fetchForYouProducts no-ops on a cache hit and on re-entry.
// The key carries ll_medium so the search-empty surface counts as its own view.
const forYouFeedViewKey = computed(() => {
  // Same reason as the tagId watcher: the outgoing instance of this shared page
  // also reacts to the incoming tab's default, and would log its view.
  if (routeName.value !== ownRouteName) return undefined
  if (!isForYouFeedVisible.value || !products.value.hasFetchedItems) return undefined
  // fetchForYouProducts marks hasFetched even when it throws, so a failed feed
  // would otherwise log a view and consume the one its retry should log.
  if (hasForYouFetchError.value) return undefined
  // Wallet included so a switched-to reader's feed counts as their own view.
  return `${isLibraryTab.value ? 'library' : 'store'}:${llMedium.value}:${walletAddress.value}`
})

watch(forYouFeedViewKey, (key) => {
  if (!key) return
  useLogEvent(isLibraryTab.value ? 'library_for_you_view' : 'store_for_you_view', {
    is_personalized: bookstoreStore.getIsForYouPersonalized(isLibraryTab.value),
    book_count: itemsCount.value,
    ll_medium: llMedium.value,
  })
}, { immediate: true })

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

async function fetchTagItems({ isRefresh = false } = {}) {
  // The personalized feed is server-ranked and a single fixed page: skip the
  // staking fetch and the client-side staking re-sort below entirely.
  if (isForYouTagId.value) {
    // Report before rethrowing: the caller turns this into a generic listing
    // error, so the feed's own failure rate is otherwise invisible.
    try {
      await bookstoreStore.fetchForYouProducts({ isRefresh, isLibrary: isLibraryTab.value })
      hasForYouFetchError.value = false
    }
    catch (error) {
      hasForYouFetchError.value = true
      useLogRecommendFetchError(error, { isLibrary: isLibraryTab.value })
      throw error
    }
    return
  }

  const currentTagId = tagId.value
  // Captured with currentTagId: both guards below run after awaits, and reading the
  // reactive computed there would follow a mid-fetch tab switch instead of this batch.
  const isPopularTag = isPopularTagId.value
  const isBestsellingTag = isBestsellingTagId.value
  const apiSortValue = mapTagIdToAPIStakingSortValue(isStakingTagId.value ? currentTagId : STAKING_TAG_DEFAULT)

  if (isStakingTagId.value) {
    await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 })
    if (isLibraryTab.value) {
      // Staking candidates are gated by getIsPlusReading before they render, so
      // they never trigger their own SWR refresh; nudge them so stale/missing
      // Plus flags self-correct and the gate reactively re-filters.
      revalidateNFTClassAggregatedMetadata(
        queryCache,
        bookstoreStore.getStakingBooks(apiSortValue).items.map(item => item.nftClassId),
      )
    }
    return
  }

  // Resolve the tag through the cache when state restore raced the parent's tags fetch,
  // so isConditionalTag below reflects this batch's tag; a miss keeps current behavior.
  let cmsTag = getBookstoreCMSTagByIdFromCache(queryCache, currentTagId)
  if (!cmsTag && !isBookstoreBuiltInListType(currentTagId)) {
    cmsTag = await fetchBookstoreCMSTagThroughCache(queryCache, currentTagId).catch((error) => {
      // 404 is the expected miss for unknown tag ids; anything else is upstream trouble.
      if (!(error instanceof FetchError && error.statusCode === 404)) {
        console.warn('[store] Failed to fetch CMS tag for sort decision:', error)
      }
      return undefined
    })
  }
  // Conditional tags arrive pre-sorted from the API so they skip the staking re-sort only;
  // the staking fetch still runs since cmsProducts decorates items with staking data.
  const isConditionalTag = !!cmsTag?.isConditional

  // Fetch staking books first so CMS tag items can be sorted by staking. The popular and
  // bestselling lists arrive pre-ranked, so they need neither the fetch nor the sort.
  if (!isPopularTag && !isBestsellingTag) {
    await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 }).catch((error) => {
      console.warn('[store] Failed to fetch staking data for CMS tag sorting:', error)
    })
  }

  // Capture the items array reference before fetch so we can detect
  // if the store replaced it (e.g. on refresh or expired-offset retry)
  const currentTagKey = getBookstoreScopedKey(currentTagId, isLibraryTab.value)
  const itemsBefore = bookstoreStore.bookstoreCMSProductsByTagKeyMap[currentTagKey]?.items
  const countBefore = isRefresh ? 0 : (itemsBefore?.length ?? 0)
  await bookstoreStore.fetchCMSProductsByTagId(currentTagId, { isRefresh, isLibrary: isLibraryTab.value })

  // Sort only the new batch by staking amount (skip 'latest' which preserves Airtable
  // order, 'popular' and 'bestselling' which arrive pre-ranked, and conditional tags)
  if (currentTagId !== 'latest' && !isPopularTag && !isBestsellingTag && !isConditionalTag) {
    const items = bookstoreStore.bookstoreCMSProductsByTagKeyMap[currentTagKey]?.items
    if (items === itemsBefore && items?.length === countBefore) return
    // If the array was replaced (refresh or offset-refresh), sort from 0
    const sortingFromIndex = (items === itemsBefore) ? countBefore : 0
    if (items && sortingFromIndex < items.length) {
      const stakingItems = bookstoreStore.getStakingBooks(apiSortValue).items
      const stakingMap = new Map(stakingItems.map(item => [item.nftClassId.toLowerCase(), item.totalStaked]))
      const newBatch = items.slice(sortingFromIndex)
      newBatch.sort((a, b) => {
        const aStaked = stakingMap.get(a.classId?.toLowerCase() || '') ?? 0n
        const bStaked = stakingMap.get(b.classId?.toLowerCase() || '') ?? 0n
        if (aStaked === bStaked) return 0
        return aStaked < bStaked ? 1 : -1
      })
      items.splice(sortingFromIndex, newBatch.length, ...newBatch)
    }
  }
}

// Returns whether the fetch completed without surfacing an error, so callers
// (e.g. the infinite-scroll watcher) can avoid chaining a follow-up fetch —
// and a second error modal — after a genuine failure.
async function fetchItems({ lazy = false, isRefresh = false } = {}): Promise<boolean> {
  // Both halves carry weight: a restored listing has items but was never fetched
  // this session, and a fetched-but-empty listing must stay retryable.
  if (lazy && products.value.items.length > 0 && products.value.hasFetchedItems) {
    return true
  }
  if (isSearchMode.value) {
    try {
      const [type, searchTerm] = searchQuery.value.split(':', 2)
      if (type === 'affiliate' && searchTerm) {
        await bookstoreStore.fetchAffiliateBooks(searchTerm, {
          isRefresh,
          isLibrary: isLibraryTab.value,
        })
      }
      else if (type && searchTerm) {
        await bookstoreStore.fetchSearchResults(
          type as 'q' | 'author' | 'publisher' | 'owner_wallet' | 'genre',
          searchTerm,
          {
            isRefresh,
            isLibrary: isLibraryTab.value,
          },
        )
      }
      return true
    }
    catch (error) {
      // A navigation-aborted fetch isn't a failure worth a modal.
      if (!isOnline.value || getIsAbortError(error)) return false
      await handleError(error, {
        title: isRefresh ? $t('store_fetch_items_error') : $t('store_fetch_more_items_error'),
      })
      return false
    }
  }

  try {
    await fetchTagItems({ isRefresh })
    return true
  }
  catch (error) {
    if (!isOnline.value || getIsAbortError(error)) return false
    await handleError(error, {
      title: isRefresh ? $t('store_fetch_items_error') : $t('store_fetch_more_items_error'),
      customHandlerMap: {
        500: {
          level: 'warning',
          actions: [
            {
              label: $t('store_fetch_items_error_retry_button_label'),
              color: 'secondary',
              variant: 'subtle',
              onClick: handleFetchItemsErrorRetryButtonClick,
            },
          ],
        },
      },
    })
    return false
  }
}

onMounted(async () => {
  // /store and /library share this page. The app surfaces users to /library;
  // web visitors stay on whichever tab they landed on.
  const targetName = (isLibraryTab.value || isApp.value) ? 'library' : 'store'
  const viewEvent = targetName === 'library' ? 'library_view' : 'store_view'
  if (routeName.value !== targetName) {
    // Log before redirecting: this shared page component won't re-run onMounted
    // after navigateTo, so app users sent /store -> /library would never log.
    useLogEvent(viewEvent)
    await navigateTo(localeRoute({ name: targetName, query: route.query }), { replace: true })
    return
  }
  useLogEvent(viewEvent)

  if (!route.query.tag && !isSearchMode.value) {
    await storePageState.restoreIfNeeded()
  }

  if (isSearchMode.value) {
    // The owner-wallet profile resolves via its own query, keyed off the route.
    await Promise.all([
      fetchItems({ lazy: true }),
      fetchTagItems().catch(() => {
        // Ignore errors when fetching tag items in search mode
      }),
    ])
    return
  }

  // Stale-while-revalidate: render persisted data immediately and refresh in the background.
  // The tags fetch lives with the header in the store.vue parent.
  if (products.value.items.length > 0 && isOnline.value) {
    fetchItems({ isRefresh: true })
    return
  }

  await fetchItems({ lazy: true })
})

onBeforeRouteLeave((to) => {
  // Keep scroll/tag state only when staying within the same tab (store ↔ store,
  // library ↔ library); switching tabs or leaving clears it.
  const toBaseName = getRouteBaseNameString(to)
  if (toBaseName && toBaseName.startsWith(routeName.value)) {
    storePageState.save(tagId.value, route.query as Record<string, string>)
  }
  else {
    storePageState.clear()
  }
})

const isLoadingMore = ref(false)
watch(
  shouldLoadMore,
  async (isSentinelVisible) => {
    // Serialize: an async watch isn't re-entrancy-safe, so a sentinel
    // visibility flip mid-fetch could otherwise stack overlapping runs (and
    // duplicate error modals).
    if (!isSentinelVisible || isLoadingMore.value) return
    isLoadingMore.value = true
    try {
      const countBefore = products.value.items.length
      const didFetch = await fetchItems()
      // Recovering an expired offset (422) re-fetches page 1 in place to mint a
      // fresh cursor without adding items. The IntersectionObserver won't
      // re-fire because the sentinel hasn't moved, so the spinner would hang
      // despite a usable cursor. If the fetch succeeded but the list didn't
      // grow and a cursor remains, advance once more so pagination continues.
      // Gating on success avoids re-firing (and re-erroring) after a failure.
      if (
        didFetch
        && shouldLoadMore.value
        && hasMoreItems.value
        && !!products.value.nextItemsKey
        && products.value.items.length <= countBefore
      ) {
        await fetchItems()
      }
    }
    finally {
      isLoadingMore.value = false
    }
  },
)

async function handleFetchItemsErrorRetryButtonClick() {
  useLogEvent('store_fetch_items_error_retry', { tag_id: tagId.value })
  window.scrollTo({ top: 0 })
  await fetchItems({ isRefresh: true })
}

function handleContactUsClick() {
  useLogEvent(isLibraryTab.value ? 'library_no_search_results_contact_click' : 'store_no_search_results_contact_click', { search_term: querySearchTerm.value })
  const searchTerm = querySearchTerm.value || queryAuthorName.value || queryPublisherName.value || queryOwnerWallet.value
  const prefilledMessage = isLibraryTab.value
    ? $t('library_no_search_results_contact_prefill', { term: searchTerm })
    : $t('store_no_search_results_contact_prefill', { term: searchTerm })
  intercom.showNewMessage(prefilledMessage)
}
</script>
