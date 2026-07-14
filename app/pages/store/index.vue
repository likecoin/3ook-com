<template>
  <div class="relative">
    <header
      :class="[
        'sticky',
        'z-1',
        'top-0',

        ...(isSearchMode ? [] : gridClasses),
        'gap-4',

        'section-container',
        'py-4',

        'bg-linear-to-b from-(--app-bg)/90 to-(--app-bg)/0',
      ]"
    >
      <!-- Search mode header -->
      <div
        v-if="isSearchMode"
        class="flex items-center gap-1 phone:gap-2 w-full"
      >
        <PillButton
          :to="localeRoute({ name: routeName })"
          icon="i-material-symbols-close-rounded"
        />

        <div
          v-if="queryOwnerWallet"
          class="flex items-center gap-3 min-w-0 flex-1"
        >
          <UAvatar
            :src="ownerWalletAvatarSrc"
            :alt="ownerWalletDisplayName || queryOwnerWallet"
            icon="i-material-symbols-person-2-rounded"
            size="lg"
          />
          <div class="flex flex-col min-w-0 flex-1">
            <p
              class="text-xs text-muted uppercase tracking-wide"
              v-text="$t('store_owner_wallet_prefix')"
            />
            <h1
              class="text-xl laptop:text-2xl font-bold text-default truncate"
              v-text="ownerWalletDisplayName || queryOwnerWallet"
            />
          </div>
        </div>
        <div
          v-else-if="queryAffiliate && !isAffiliateNotFound"
          class="flex items-center min-w-0 ring-inset ring-2 ring-theme-black dark:ring-muted bg-(--app-bg) rounded-full"
        >
          <UAvatar
            :src="affiliateAvatarSrc"
            :alt="affiliateDisplayName"
            icon="i-material-symbols-person-2-rounded"
            :ui="{ root: 'size-8 tablet:size-9 border border-2 border-theme-black dark:border-muted' }"
          />
          <div class="flex flex-col justify-center min-w-0 pt-0.5 pl-2 pr-4">
            <span
              class="text-[0.625rem] tablet:text-xs text-muted uppercase tracking-wide leading-none"
              v-text="$t('store_affiliate_prefix')"
            />
            <h1
              class="-mt-1 font-bold text-sm tablet:text-default truncate"
              v-text="affiliateDisplayName"
            />
          </div>
        </div>
        <h1 v-else-if="searchModeContext">
          <PillButton
            is-active
            is-static
            :label="`${searchModeContext.titlePrefix}${searchModeContext.label}`"
          />
        </h1>
      </div>

      <!-- Tag selector -->
      <div
        v-else
        class="flex items-center gap-1 phone:gap-2 w-full col-span-full"
      >
        <UButton
          v-if="!isApp && !isLibraryTab"
          :to="isDefaultTagId
            ? localeRoute({ name: 'about', query: { ll_medium: 'about-logo' } })
            : localeRoute({ name: routeName })"
          variant="link"
          :ui="{
            base: ['shrink-0', 'p-0 sm:p-0'],
          }"
          :title="'3ook.com'"
          @click="handleLogoClick"
        >
          <img
            src="/logo.svg"
            alt="3ook.com"
            class="w-8 h-8 block"
          >
        </UButton>

        <UButton
          v-if="!isApp && isLibraryTab"
          :to="isDefaultTagId
            ? localeRoute({ name: 'about', hash: '#library', query: { ll_medium: 'about-logo' } })
            : localeRoute({ name: routeName })"
          variant="link"
          icon="i-3ook-com-library-rounded"
          color="neutral"
          :ui="{
            base: ['shrink-0', 'p-0 sm:p-0'],
            leadingIcon: ['size-8', 'text-highlighted'],
          }"
          :title="$t('library_tab_title')"
          :aria-label="$t('library_tab_title')"
          @click="handleLibraryLogoClick"
        />

        <PillButtonGroup
          :model-value="tagId"
          :items="allTagItems"
          :aria-label="$t('store_tag_more_categories_label')"
          :is-loading="!bookstoreStore.hasFetchedBookstoreCMSTags && isDefaultTagId"
          class="grow min-w-0"
          @click="(item) => handleTagClick(item.value)"
        />

        <StoreSearchModal :is-library-tab="isLibraryTab" />

        <UTooltip
          v-if="!isLibraryTab"
          :text="$t('book_list_title')"
        >
          <PillButton
            icon="i-material-symbols-favorite-outline-rounded"
            :aria-label="$t('book_list_title')"
            :to="localeRoute({ name: 'list' })"
            @click="handleBookListTagClick"
          />
        </UTooltip>
      </div>
    </header>

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
          ll-source="bookstore"
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

import { getGenreI18nKey } from '~~/shared/constants/book-categories'
import { MAX_BOOKSTORE_PAGE_SIZE, isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

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
const queryCache = useQueryCache()
const nftStore = useNFTStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const { dismissLibraryIntroBanner } = useLibraryIntroBanner()
const storePageState = useStorePageState(routeName)
const isOnline = useOnline()
const isAdultContentEnabled = useAdultContentSetting()
const { isApp } = useAppDetection()
const intercom = useIntercom()
// Effective Plus (canonical flag OR optimistic device-store entitlement) so a
// just-subscribed member isn't briefly treated as non-Plus before the webhook lands.
const { isPlusOrDevicePlus } = useDevicePlusEntitlement()

const querySearchTerm = computed(() => getRouteQuery('q', ''))
const queryAuthorName = computed(() => getRouteQuery('author', ''))
const queryPublisherName = computed(() => getRouteQuery('publisher', ''))
const queryOwnerWallet = computed(() => getRouteQuery('owner_wallet', ''))
const queryGenre = computed(() => getRouteQuery('genre', ''))
// Normalize so a stray leading `@` (manual URL, or `from=@id` reuse) resolves
// the same as a bare likerId for profile lookup, config fetch, and the subscribe CTA.
const queryAffiliate = computed(() => normalizeLikerId(getRouteQuery('affiliate', '')))
// Set by the post-purchase redirect (plus/success) to greet a just-subscribed member.
const queryWelcome = computed(() => getRouteQuery('welcome', ''))

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
  return bookstoreStore.getAffiliateConfigByLikerId(queryAffiliate.value)
})
// Publisher drill-down links rendered as header chrome — the affiliate view only
// loads each publisher's first page, so these point at the full owner_wallet list.
const affiliatePublisherWallets = computed(() =>
  (affiliateConfig.value?.active ? affiliateConfig.value.affiliatePublisherWallets : []))
const affiliatePublisherInfoQueries = useLikerInfosByWalletAddressesQuery(affiliatePublisherWallets)
const affiliatePublishers = computed(() => affiliatePublisherWallets.value.map((wallet, index) => ({
  wallet,
  name: affiliatePublisherInfoQueries.value[index]?.data?.displayName || shortenWalletAddress(wallet),
})))
// Only affiliates that actually ship a voice can promise voice playback; some
// affiliates curate books without one.
const affiliateHasVoices = computed(() =>
  !!(affiliateConfig.value?.active && affiliateConfig.value.customVoices?.length),
)
// Gate on a real voice so we never promise narration the affiliate doesn't offer.
const isAffiliateCTAVisible = computed(() =>
  !!queryAffiliate.value && !isPlusOrDevicePlus.value && affiliateHasVoices.value,
)
const affiliateSubscribeRoute = computed(() => localeRoute({
  name: 'member',
  query: { from: `@${queryAffiliate.value}`, ll_medium: 'affiliate-store' },
}))

// Resolve the affiliate's profile during SSR so its display name and avatar land
// in the title/OG tags (the watcher-based client fetch happens too late for that),
// and detect an invalid affiliate id (404) to render a not-found state. useAsyncData
// carries the 404 boolean in the payload (error-state queries don't serialize), while
// the helper primes the query cache, which colada-nuxt serializes into the payload
// so the client hydrates without refetching.
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
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gad_source', 'fbclid', 'll_source', 'll_medium', 'affiliate', 'from',
]
const hasCampaignAttribution = computed(() =>
  STORE_INTRO_ATTRIBUTION_KEYS.some(key => !!getRouteQuery(key)),
)
// Welcome a fresh organic/direct visitor on the bare store landing. Gate on mount
// and the persisted dismiss so the alerts section collapses instead of leaving an
// empty wrapper, and skip `tag` deep-links since those are category pages.
const { isDismissed: isStoreIntroBannerDismissed, dismissStoreIntroBanner } = useStoreIntroBanner()
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
const isLibraryIntroBannerVisible = computed(() => isLibraryTab.value && !isSearchMode.value && !entity.value)

const {
  STAKING_TAG_DEFAULT,
  tagId,
  isDefaultTagId,
  isStakingTagId,
  isPopularTagId,
  getIsLocalHistoriesTagId,
  normalizedLocale,
  activeCMSTag,
  allTagItems,
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
    || isBookstoreBuiltInListType(tagId.value)
  ) return

  let tag: BookstoreCMSTag | undefined
  try {
    tag = await bookstoreStore.fetchBookstoreCMSTag(tagId.value)
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

const searchModeContext = computed(() => {
  if (!isSearchMode.value) return null
  if (queryAffiliate.value) {
    // Suppress affiliate chrome/title for an unknown id so the raw liker id never
    // surfaces as a name; the page falls back to the generic store title instead.
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
      // the reading-ranked popular list — suppress the badge rather than mislabel it.
      likeRank: isPopularTagId.value ? 0 : (stakingInfo?.likeRank ?? 0),
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

// Library mode keeps only Plus-reading books. CMS/built-in listings carry the
// flag inline; staking/search items trust already-loaded BookstoreInfo, which
// the proactive revalidate in fetchTagItems self-heals if stale.
function getIsPlusReading(item: BookstoreItem): boolean {
  if (typeof item.isPlusReadingEnabled === 'boolean') return item.isPlusReadingEnabled
  const info = bookstoreStore.getBookstoreInfoByNFTClassId(item.classId || item.id || '')
  return !!info?.isPlusReadingEnabled
}

const baseProducts = computed<BookstoreItemList>(() => {
  if (searchResults.value && !isSearchResultEmpty.value) {
    const filtered = searchResults.value.items.filter((item) => {
      const bookstoreInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.classId || '')
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
      const bookInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.nftClassId)
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

  if (!isAdultContentEnabled.value) {
    const filtered = cmsProducts.value.items.filter(item => !item.isAdultOnly)
    return { ...cmsProducts.value, items: filtered }
  }
  return cmsProducts.value
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
    || (isLibraryTab.value && nftStore.isRevalidatingMetadata)
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
    const metadataValue = nftStore.getNFTClassById(item.classId)?.metadata?.[metadataKey]
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
    // Same-origin proxy preload: the staking listing now routes through our own
    // origin (/api/store/staking-books), so priming it is safe on iOS — the
    // cross-origin indexer hop happens server-side and can't poison WKWebView's
    // NSURLSession pool the way a direct cross-origin fetch could.
    ...(isStakingTagId.value
      ? [{
          rel: 'preload',
          href: `/api/store/staking-books?sort_by=${mapTagIdToAPIStakingSortValue(tagId.value)}&sort_order=desc&limit=100`,
          as: 'fetch' as const,
          crossorigin: 'anonymous' as const,
          key: 'preload-staking-books',
        }]
      // The library scopes its listing with `library=1`; preloading without it primes a
      // different response than the one the page goes on to fetch.
      : [{
          rel: 'preload',
          href: `/api/store/products?tag=${encodedTagId}&limit=${MAX_BOOKSTORE_PAGE_SIZE}&ts=${getTimestampRoundedToMinute()}${isLibraryTab.value ? '&library=1' : ''}`,
          as: 'fetch' as const,
          crossorigin: 'anonymous' as const,
          key: 'preload-store-products',
        }]),
  ]

  return {
    title: ogTitle.value,
    meta,
    link,
    script,
  }
})

watch(
  () => route.query.tag,
  async (newTag, oldTag) => {
    if (newTag !== oldTag) {
      await fetchItems({ lazy: true })

      if (!isSearchMode.value) {
        if (!newTag) {
          storePageState.clear()
        }
        storePageState.restoreScrollIfNeeded()
      }
    }
  },
)

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
  return undefined
})

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

async function fetchTags() {
  try {
    await bookstoreStore.fetchBookstoreCMSTags()
  }
  catch (error) {
    // Offline cold launch fails these network fetches expectedly; the cached
    // shell still renders, so don't surface a blocking error modal.
    if (!isOnline.value) return
    await handleError(error, {
      title: $t('store_fetch_tags_error'),
    })
  }
}

async function fetchTagItems({ isRefresh = false } = {}) {
  const currentTagId = tagId.value
  // Captured with currentTagId: both guards below run after awaits, and reading the
  // reactive computed there would follow a mid-fetch tab switch instead of this batch.
  const isPopularTag = isPopularTagId.value
  const apiSortValue = mapTagIdToAPIStakingSortValue(isStakingTagId.value ? currentTagId : STAKING_TAG_DEFAULT)

  if (isStakingTagId.value) {
    await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 })
    if (isLibraryTab.value) {
      // Staking candidates are gated by getIsPlusReading before they render, so
      // they never trigger their own SWR refresh; nudge them so stale/missing
      // Plus flags self-correct and the gate reactively re-filters.
      nftStore.revalidateNFTClassAggregatedMetadata(
        bookstoreStore.getStakingBooks(apiSortValue).items.map(item => item.nftClassId),
      )
    }
    return
  }

  // Fetch staking books first so CMS tag items can be sorted by staking. The popular
  // list arrives ranked by reading time, so it needs neither the fetch nor the sort.
  if (!isPopularTag) {
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
  // order, and 'popular' which arrives ranked by reading time)
  if (currentTagId !== 'latest' && !isPopularTag) {
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
  if (lazy && products.value.items.length > 0) {
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

  // Stale-while-revalidate: when persisted data already fills the landing,
  // render it immediately and refresh in the background instead of blocking
  // (or, offline, instead of failing) on the network.
  if (products.value.items.length > 0 && isOnline.value) {
    fetchTags()
    fetchItems({ isRefresh: true })
    return
  }

  await Promise.all([
    fetchTags(),
    fetchItems({ lazy: true }),
  ])
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

async function handleTagClick(tagValue?: string) {
  if (!tagValue || tagValue === tagId.value) {
    return
  }

  // Engaging with a category means the intro has served its purpose.
  if (isLibraryTab.value) dismissLibraryIntroBanner()
  else dismissStoreIntroBanner()

  if (tagValue === 'local-histories') {
    useLogEvent(isLibraryTab.value ? 'library_tag_click' : 'store_tag_click', { tag_id: tagValue })
    await navigateTo(localeRoute({ name: 'local-histories' }))
    return
  }

  useLogEvent(isLibraryTab.value ? 'library_tag_click' : 'store_tag_click', { tag_id: tagValue })
  tagId.value = tagValue
}

async function handleBookListTagClick() {
  useLogEvent('store_tag_book_list_click')
}

async function handleLogoClick() {
  if (isDefaultTagId.value) {
    useLogEvent('store_about_logo_click')
  }
  else {
    useLogEvent('store_logo_click')
    storePageState.clear()
  }
}

async function handleLibraryLogoClick() {
  if (isDefaultTagId.value) {
    useLogEvent('library_about_logo_click')
  }
  else {
    useLogEvent('library_logo_click')
    storePageState.clear()
  }
}

function handleContactUsClick() {
  useLogEvent(isLibraryTab.value ? 'library_no_search_results_contact_click' : 'store_no_search_results_contact_click', { search_term: querySearchTerm.value })
  const searchTerm = querySearchTerm.value || queryAuthorName.value || queryPublisherName.value || queryOwnerWallet.value
  intercom.showNewMessage($t('store_no_search_results_contact_prefill', { term: searchTerm }))
}
</script>
