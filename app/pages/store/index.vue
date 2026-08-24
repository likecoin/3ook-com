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
        :display-name="profileDisplayName"
        :avatar-src="profileAvatarSrc"
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
      v-if="affiliateLikerId && affiliatePublishers.length"
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
            :to="localeRoute({ name: listingRouteName, query: { owner_wallet: publisher.wallet } })"
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

      <BookstoreGridSkeleton v-if="storeListStatus === 'loading'" />

      <StoreListStatus
        v-else-if="visibleListStatus"
        :status="visibleListStatus"
        :route-name="listingRouteName"
        @contact-click="handleContactUsClick"
      />

      <p
        v-if="isForYouFallbackHintVisible"
        class="w-full mb-6 text-sm text-muted text-center"
        v-text="$t('store_for_you_fallback_hint')"
      />

      <h2
        v-if="affiliateLikerId && itemsCount > 0"
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
          :class="[getGridItemClassesByIndex(index), getGridItemEnterClass(item.classId)]"
          :style="getGridItemEnterStyle(index)"
          :nft-class-id="item.classId"
          :book-name="item.title"
          :book-cover-src="item.imageUrl"
          :price="item.minPrice"
          :price-override="item.minPriceInDecimalByCurrency"
          :like-rank="item.likeRank ?? 0"
          :lazy="index >= columnMax"
          :priority="index < columnMax"
          :ll-medium="itemLLMedium"
          :should-show-plus-reading-icon="!isLibraryTab"
          :is-library="isLibraryTab"
          :tag="tagId"
          :ll-source="GRID_LL_SOURCE"
          @open="handleBookstoreItemOpen($event, index)"
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

import { isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'
import { getStorePublisherRouteName } from '~~/shared/constants/store-routes'
import { formatLikerIdHandle } from '~~/shared/utils/liker-id'

const nuxtApp = useNuxtApp()
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseNameString = useRouteBaseNameString()
// /store and /library share this file; the route name selects the mode. Each
// tab also has a publisher variant (store-userId / library-userId) rendering
// the same grid scoped to one profile, so match on the prefix.
const routeName = computed(() => getRouteBaseNameString() || 'store')
const isLibraryTab = computed(() => routeName.value.startsWith('library'))
// Navigations that mean "the plain listing" — tag routes, tab redirects, the
// close button's destination — target the tab, never the publisher variant.
const listingRouteName = computed(() => (isLibraryTab.value ? 'library' : 'store'))
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
const storePageState = useStorePageState(listingRouteName)
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
  isSearchMode,
  storeEntity,
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
  !!affiliateLikerId.value && !isPlusOrDevicePlus.value && affiliateHasVoices.value,
)
const affiliateSubscribeRoute = computed(() => localeRoute({
  name: 'member',
  query: { from: formatLikerIdHandle(affiliateLikerId.value), ll_medium: 'affiliate-store' },
}))

// Only greet actual members, so a shared/bookmarked `welcome` link can't surface
// the banner for non-subscribers.
const isWelcomeBannerVisible = computed(() => queryWelcome.value === '1' && isPlusOrDevicePlus.value)
const welcomeBannerDescription = computed(() =>
  affiliateLikerId.value && affiliateHasVoices.value
    ? $t('plus_welcome_banner_affiliate_description', { name: profileDisplayName.value })
    : $t('plus_welcome_banner_description'),
)
function handleWelcomeBannerDismiss() {
  const { welcome: _welcome, ...query } = route.query
  navigateTo(
    localeRoute({
      name: routeName.value,
      params: route.params,
      query,
    }),
    { replace: true },
  )
}

// Greet a visitor on the store landing. Gate on mount and the persisted
// dismiss, and skip tag deep-links since those are category pages. The banner
// also self-hides until its experiment flag resolves.
const { isDismissed: isStoreIntroBannerDismissed } = useStoreIntroBanner()
const isMounted = useMounted()
const isStoreIntroBannerVisible = computed(() =>
  isMounted.value
  && !isStoreIntroBannerDismissed.value
  && !isApp.value
  && !isLibraryTab.value
  && !isSearchMode.value
  && !isWelcomeBannerVisible.value
  && !isPlusOrDevicePlus.value
  && !getStoreTagIdFromRoute(route),
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
} = useStoreTags({ routeName: listingRouteName, isLibraryTab })

// Shared deep-link classification: the built-in guard list,
// the CMS tag fetch (which also fills the cache so tag meta can server-render),
// and 404 tolerance live here; the two callers below keep their own navigation and error policy.
async function classifyTagDeepLink(): Promise<'local-histories' | 'skip' | 'valid' | 'invalid'> {
  // Classify the raw route tag; the resolved tagId is coerced to the default for invalid tags,
  // which would read as 'skip' and leave a stale URL.
  const rawTagId = getStoreTagIdFromRoute(route)
  if (getIsLocalHistoriesTagId(rawTagId)) return 'local-histories'
  if (!rawTagId) return 'skip'

  // Class ids never reach the listing route; anything 0x-ish is not a tag.
  if (getHasEVMAddressPrefix(rawTagId)) return 'invalid'

  // A tag the tab coerced away (e.g. a cross-tab link) is invalid.
  if (rawTagId !== tagId.value) return 'invalid'

  if (
    isDefaultTagId.value
    || isStakingTagId.value
    || isForYouTagId.value
    || isBookstoreBuiltInListType(rawTagId)
  ) return 'skip'

  try {
    const tag = await fetchBookstoreCMSTagThroughCache(queryCache, rawTagId)
    if (!tag) return 'invalid'
    // The record settles cross-tab validity before the tags list arrives.
    return (isLibraryTab.value ? tag.isForLibrary : tag.isForStore) ? 'valid' : 'invalid'
  }
  catch (error) {
    // 404 is the expected miss for an unknown tag id.
    if (error instanceof FetchError && error.statusCode === 404) return 'invalid'
    throw error
  }
}

// Redirects an invalid deep link away: local-histories to its page ('navigated'),
// an unknown tag to the default listing ('stripped').
async function redirectTagDeepLink(result: Awaited<ReturnType<typeof classifyTagDeepLink>>): Promise<'navigated' | 'stripped' | 'none'> {
  if (result === 'local-histories') {
    await navigateTo(localeRoute({ name: 'local-histories' }), { replace: true })
    return 'navigated'
  }
  if (result === 'invalid') {
    const { tag: _tag, ...query } = route.query
    await navigateTo(localeRoute({
      name: routeName.value,
      params: { ...route.params, tagId: '' },
      query,
    }), { replace: true })
    return 'stripped'
  }
  return 'none'
}

// SSR validation for tag deep links, filling the CMS tag cache for tag meta.
await callOnce(async () => {
  const result = await classifyTagDeepLink()
  // Restore Nuxt context lost across the await before calling navigateTo/localeRoute.
  await nuxtApp.runWithContext(() => redirectTagDeepLink(result))
})

// Mount-time validation for SPA entries the SSR-time callOnce no longer covers.
async function validateTagDeepLinkIfNeeded(): Promise<'navigated' | 'stripped' | 'none'> {
  let result: Awaited<ReturnType<typeof classifyTagDeepLink>>
  try {
    result = await classifyTagDeepLink()
  }
  catch (error) {
    // Keep the tag on non-404 failures; the items fetch surfaces the error.
    console.warn('[store] Failed to validate tag deep link:', error)
    return 'none'
  }
  return redirectTagDeepLink(result)
}

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

  // `?affiliate=` and `?owner_wallet=` keep serving 200s, but /store/@<id> is
  // the one indexed URL for a profile, so they canonicalize to it whenever the
  // Liker ID resolves. A wallet without one has nothing to point at.
  if (canonicalProfileLikerId.value) {
    const publisherPath = localeRoute({
      name: getStorePublisherRouteName(listingRouteName.value),
      params: { userId: canonicalProfileLikerId.value },
    })?.path
    if (publisherPath) return `${baseURL}${publisherPath}`
  }

  // The tag rides in the path (/store/<tagId>), so it needs no canonical param.
  const path = route.path

  const canonicalParams = new URLSearchParams()

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
  // An entity listing isn't the tag's page, so don't borrow its name: a profile
  // that fails to resolve would otherwise be titled with the default tag.
  if (tagName.value && !isSearchMode.value) {
    return [tagName.value, pageTitle.value].join(' - ')
  }
  return pageTitle.value
})

const ogImage = computed(() => {
  // Surface the publisher's own avatar on their store link when one resolved,
  // whichever URL form named them.
  if (storeEntity.value?.avatarSrc) {
    return storeEntity.value.avatarSrc
  }
  return `${runtimeConfig.public.baseURL}/images/og/${listingRouteName.value}.jpg`
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
      // The indexer ranks every book NFT on chain, listed here or not, so drop the
      // ones the bookstore resolved as absent (never listed, or pending review).
      if (bookInfo === null) return
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
// empty-state flash on cold load. A never-fetched listing counts too: a switched-to
// tag has no bucket yet, and fetchTagItems awaits the tag lookup and staking fetch
// before isFetchingItems flips — leaving it blank, with no skeleton, until then.
const isLoadingInitialItems = computed(() => (
  itemsCount.value === 0
  && (
    products.value.isFetchingItems
    || !products.value.hasFetchedItems
    || (isLibraryTab.value && isRevalidatingNFTClassMetadata.value)
  )
))
const hasMoreItems = computed(() => !!products.value.nextItemsKey || !!products.value.mayHaveMore || !products.value.hasFetchedItems)

// Order matters: the first matching status wins.
const storeListStatus = computed(() => {
  if (isProfileNotFound.value) return 'profile-not-found' as const
  // Ahead of the loading check: this profile has no listing to wait for.
  if (isProfileListingEmpty.value) return 'no-items' as const
  if (isLoadingInitialItems.value) return 'loading' as const
  if (isSearchResultEmpty.value) return 'search-empty' as const
  if (itemsCount.value === 0 && !products.value.isFetchingItems && products.value.hasFetchedItems) return 'no-items' as const
  return null
})

// Split out rather than narrowed in the template, which StoreListStatus's prop
// union needs now that it no longer accepts 'loading'.
const visibleListStatus = computed(() =>
  storeListStatus.value === 'loading' ? null : storeListStatus.value)

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

// Captured once, outside the reactive head callback: re-evaluating `ts` a minute later
// would patch the keyed link into a fresh 100-item request nothing consumes,
// since the store pins its own `ts` per tag (see fetchCMSProductsByTagId).
const initialListingPreloadHref = (!isStakingTagId.value && !isForYouTagId.value)
  ? getBookstoreCMSProductsPreloadHref(tagId.value, {
      ts: getTimestampRoundedToMinute(),
      isLibrary: isLibraryTab.value,
    })
  : undefined

useHead(() => {
  const meta = []
  const script = []

  if (isSearchResultEmpty.value || isProfileNotFound.value) {
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
      type: 'application/ld+json' as const,
      innerHTML: JSON.stringify(structuredData.value),
    })

    if (entityStructuredData.value) {
      script.push({
        type: 'application/ld+json' as const,
        innerHTML: JSON.stringify(entityStructuredData.value),
      })
    }
  }

  const listingPreloadLinks = []
  if (isStakingTagId.value) {
    // Same-origin proxy preload: the staking listing now routes through our own
    // origin (/api/store/staking-books), so priming it is safe on iOS — the
    // cross-origin indexer hop happens server-side and can't poison WKWebView's
    // NSURLSession pool the way a direct cross-origin fetch could.
    listingPreloadLinks.push({
      rel: 'preload' as const,
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
  else if (initialListingPreloadHref) {
    listingPreloadLinks.push({
      rel: 'preload' as const,
      href: initialListingPreloadHref,
      as: 'fetch' as const,
      crossorigin: 'anonymous' as const,
      key: 'preload-store-products',
    })
  }
  const link = [
    {
      rel: 'canonical' as const,
      href: canonicalURL.value,
    },
    {
      rel: 'preload' as const,
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
    const hasTagInRoute = !!getStoreTagIdFromRoute(route)
    // Scroll to top before the fetch: a restored listing revalidates on the way
    // in, and awaiting that first would strand the reader mid-page meanwhile.
    // Restoring a saved position still waits, since it needs the list rendered.
    if (!isSearchMode.value && !hasTagInRoute) {
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

// Watch the resolved key, not the raw params: on the publisher route it only
// settles once the profile lookup returns, and a params-only watcher would
// leave that first listing latched on its skeleton.
watch(searchQuery, async () => {
  if (isSearchMode.value) {
    await fetchItems({ lazy: true })
  }
})

// Normalize a lowercased ?owner_wallet= to its checksummed form. Gated on the
// query being present: the publisher route derives its wallet from the profile
// and must not grow an owner_wallet param it never had.
watch(ownerWalletInfo, (info) => {
  if (!queryOwnerWallet.value) return
  if (info?.evmWallet && queryOwnerWallet.value.toLowerCase() !== info.evmWallet.toLowerCase()) {
    navigateTo(localeRoute({
      name: routeName.value,
      params: route.params,
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

// Tag attribution rides on the product link, so opening a book from a tag
// listing is what credits the tag; the default tab stays unattributed.
const itemLLMedium = computed(() =>
  llMedium.value || (isDefaultTagId.value ? undefined : `tag-${tagId.value}`))
// One value for the grid's links, its clicks and its impression, so the three
// cannot drift apart.
const GRID_LL_SOURCE = 'bookstore'

const hasForYouFetchError = ref(false)

function handleBookstoreItemOpen(classId: string, index: number) {
  if (!isForYouFeedVisible.value) return
  useLogRecommendBookClick({
    nftClassId: classId,
    isPersonalized: bookstoreStore.getIsForYouPersonalized(isLibraryTab.value),
    llMedium: llMedium.value,
    llSource: GRID_LL_SOURCE,
    // The grid renders `products.items` in rank order, so the render index is
    // the served rank.
    rank: index,
    feedId: bookstoreStore.getForYouFeedId(isLibraryTab.value),
    isLibrary: isLibraryTab.value,
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
  useLogRecommendBooksView({
    eventName: isLibraryTab.value ? 'library_for_you_view' : 'store_for_you_view',
    llMedium: llMedium.value,
    llSource: GRID_LL_SOURCE,
    isPersonalized: bookstoreStore.getIsForYouPersonalized(isLibraryTab.value),
    isLibrary: isLibraryTab.value,
    bookCount: itemsCount.value,
    feedId: bookstoreStore.getForYouFeedId(isLibraryTab.value),
    // Ranked ids, so a click joins back to the list it came from.
    nftClassIds: products.value.items.map(item => item.classId || item.id),
  })
}, { immediate: true })

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

// Staggers the leading items only; the rest enter together. This is a flat count,
// not a row: columnMax is the widest breakpoint's column count, so on a narrow
// grid the cascade runs down several short rows.
const GRID_ENTER_STAGGER_MS = 40

// Items already on screen at hydration never animate: fading in the SSR'd paint
// would flash the grid and disturb this page's LCP. Filled in a hook registered
// after useMounted's own, so it is ready before the render that flag triggers.
const hydratedItemIds = new Set<string>()
onMounted(() => {
  products.value.items.forEach((item) => {
    if (item.classId) hydratedItemIds.add(item.classId)
  })
})

function getGridItemEnterClass(classId?: string) {
  return isMounted.value && !!classId && !hydratedItemIds.has(classId)
    ? 'book-grid-item-enter'
    : undefined
}

function getGridItemEnterStyle(index: number) {
  if (index >= columnMax.value) return undefined
  return { '--grid-enter-delay': `${index * GRID_ENTER_STAGGER_MS}ms` }
}

// Offered for any listing failure, not just a 500: a dropped connection surfaces
// as a `<no response>` with no status code, so a status-keyed retry can't reach
// the most common failure.
function getFetchItemsErrorActions(): ErrorHandlerAction[] {
  return [{
    label: $t('store_fetch_items_error_retry_button_label'),
    color: 'secondary',
    variant: 'subtle',
    onClick: handleFetchItemsErrorRetryButtonClick,
  }]
}

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
        actions: getFetchItemsErrorActions(),
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
      actions: getFetchItemsErrorActions(),
      customHandlerMap: {
        // Still load-bearing without its own actions: downgrades the modal to a
        // warning and suppresses the stack dump an upstream 500 doesn't warrant.
        500: {
          level: 'warning',
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

  // Validate before the tab redirect below: onMounted won't re-run after it,
  // so an invalid tag would otherwise never be cleaned on the target tab.
  const tagValidation = await validateTagDeepLinkIfNeeded()
  if (tagValidation === 'navigated') return

  // The publisher route is a destination in its own right, not a tab to be
  // redirected: an in-app visitor on /store/@<id> stays on that publisher.
  if (!routeUserId.value && routeName.value !== targetName) {
    // Log before redirecting: this shared page component won't re-run onMounted
    // after navigateTo, so app users sent /store -> /library would never log.
    useLogEvent(viewEvent)
    await navigateTo(localeRoute({ name: targetName, params: route.params, query: route.query }), { replace: true })
    return
  }
  useLogEvent(viewEvent)

  // Dropping an invalid tag resolves back to the default; the tagId watcher refetches.
  if (tagValidation === 'stripped') return

  if (!getStoreTagIdFromRoute(route) && !isSearchMode.value) {
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
  if (toBaseName && toBaseName.startsWith(listingRouteName.value)) {
    // Save the 'default' marker, not the resolved id: the default listing's URL
    // carries no tag, and its id shifts with login state anyway.
    storePageState.save(isDefaultTagId.value ? 'default' : tagId.value, route.query as Record<string, string>)
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
  const searchTerm = querySearchTerm.value || queryAuthorName.value || queryPublisherName.value || ownerWallet.value
  const prefilledMessage = isLibraryTab.value
    ? $t('library_no_search_results_contact_prefill', { term: searchTerm })
    : $t('store_no_search_results_contact_prefill', { term: searchTerm })
  intercom.showNewMessage(prefilledMessage)
}
</script>
