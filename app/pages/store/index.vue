<template>
  <div class="relative">
    <header
      :class="[
        'sticky',
        'z-1',
        'top-0',

        ...(isSearchMode ? [] : gridClasses),
        'gap-4',

        'w-full',
        'max-w-[1440px]',
        'mx-auto',
        'px-4 laptop:px-12',
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
        <h1
          v-else
          class="px-3 py-1 text-theme-cyan font-medium bg-theme-black border-1 border-theme-black rounded-full"
        >
          <span v-if="querySearchTerm">{{ $t('store_search_prefix') }}{{ querySearchTerm }}</span>
          <span v-else-if="queryAuthorName">{{ $t('store_author_prefix') }}{{ queryAuthorName }}</span>
          <span v-else-if="queryPublisherName">{{ $t('store_publisher_prefix') }}{{ queryPublisherName }}</span>
          <span v-else-if="queryGenre">{{ $t('store_genre_prefix') }}{{ localizedGenreName }}</span>
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

        <PillButtonGroup
          :model-value="tagId"
          :items="allTagItems"
          :is-loading="!bookstoreStore.hasFetchedBookstoreCMSTags && isDefaultTagId"
          class="grow min-w-0"
          @click="(item) => handleTagClick(item.value)"
        />

        <UModal
          v-model:open="isSearchInputOpen"
          :close="false"
          :ui="{
            content: 'max-phone:top-30 top-1/4',
            body: 'p-0 sm:p-0',
            footer: [
              'flex',
              'items-center',
              'justify-between',

              'sm:px-4',
              'pl-3 sm:pl-3',
              'py-2',
            ],
          }"
        >
          <PillButton
            icon="i-material-symbols-search-rounded"
            @click="handleSearchTagClick"
          />

          <template #body>
            <form
              class="w-full"
              action="."
              @submit.prevent="handleSearchSubmit"
            >
              <UInput
                v-model="searchInputValue"
                class="w-full"
                icon="i-material-symbols-search-rounded"
                size="xl"
                variant="none"
                :placeholder="$t('store_search_input_placeholder')"
                type="search"
                :ui="{
                  base: 'py-5',
                  trailing: 'pe-2',
                }"
                @blur="isSearchInputOpen = false"
              >
                <template
                  v-if="searchInputValue.length"
                  #trailing
                >
                  <UButton
                    color="neutral"
                    variant="link"
                    icon="i-material-symbols-close-rounded"
                    @click="handleClearSearchInputButton"
                  />
                </template>
              </UInput>
            </form>
          </template>
        </UModal>

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

    <main
      class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16"
    >
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

      <div
        v-if="isSearchResultEmpty"
        class="w-full mb-8"
      >
        <div class="flex flex-col items-center py-8">
          <UIcon
            class="opacity-20 mb-4"
            name="i-material-symbols-search-off-rounded"
            size="64"
          />
          <h2
            class="text-xl font-bold text-highlighted mb-2"
            v-text="$t('store_no_search_results')"
          />
          <p
            class="text-muted"
            v-text="$t('store_showing_recommendations')"
          />
          <p
            class="text-muted mt-4"
            v-text="$t('store_no_search_results_contact_message')"
          />
          <UButton
            class="mt-2"
            :label="$t('store_no_search_results_contact')"
            leading-icon="i-material-symbols-chat-bubble-outline-rounded"
            variant="outline"
            color="neutral"
            @click="handleContactUsClick"
          />
        </div>
      </div>

      <div
        v-else-if="itemsCount === 0 && !products.isFetchingItems && products.hasFetchedItems"
        class="flex flex-col items-center m-auto"
      >
        <UIcon
          class="opacity-20 mb-4"
          name="i-material-symbols-menu-book-outline-rounded"
          size="128"
        />

        <p
          class="text-muted"
          v-text="$t('store_no_items')"
        />

        <UButton
          class="mt-3"
          :label="$t('store_no_items_learn_more')"
          :to="localeRoute({ name: 'about', query: { ll_medium: 'about-link', ll_source: 'store-empty' } })"
          variant="link"
          color="neutral"
          size="sm"
          trailing-icon="i-material-symbols-arrow-forward-rounded"
        />
      </div>

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
          ll-source="bookstore"
        />
      </ul>
      <div
        v-if="hasMoreItems"
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'

import { getGenreI18nKey } from '~~/shared/constants/book-categories'
import { MAX_BOOKSTORE_PAGE_SIZE, isBookstoreBuiltInListType } from '~~/shared/utils/bookstore'

const nuxtApp = useNuxtApp()
const { t: $t, locale } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseNameString = useRouteBaseNameString()
// /store and /library share this file; the route name selects the mode.
const routeName = computed(() => getRouteBaseNameString() || 'store')
const isLibraryTab = computed(() => routeName.value === 'library')
const getRouteQuery = useRouteQuery()
const runtimeConfig = useRuntimeConfig()
const bookstoreStore = useBookstoreStore()
const metadataStore = useMetadataStore()
const nftStore = useNFTStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const storePageState = useStorePageState(routeName)
const isOnline = useOnline()
const isMobile = useMediaQuery('(max-width: 425px)')
const isAdultContentEnabled = useAdultContentSetting()
const { isApp } = useAppDetection()
const intercom = useIntercom()

const querySearchTerm = computed(() => getRouteQuery('q', ''))
const queryAuthorName = computed(() => getRouteQuery('author', ''))
const queryPublisherName = computed(() => getRouteQuery('publisher', ''))
const queryOwnerWallet = computed(() => getRouteQuery('owner_wallet', ''))
const queryGenre = computed(() => getRouteQuery('genre', ''))

const ownerWalletInfo = computed(() => {
  if (!queryOwnerWallet.value) return null
  return metadataStore.getLikerInfoByWalletAddress(queryOwnerWallet.value) || null
})
const ownerWalletAvatarSrc = computed(() => {
  return ownerWalletInfo.value?.avatarSrc || ''
})
const ownerWalletDisplayName = computed(() => {
  return ownerWalletInfo.value?.displayName || ''
})

// Search query key for bookstore store
const searchQuery = computed(() => {
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

const STAKING_SORT_TAG_PREFIX = 'staking-'
const STAKING_SORT_OPTIONS = [
  { value: 'total-staked', isPublic: true },
  { value: 'staker-count' },
  { value: 'recent' },
].map(option => ({
  ...option,
  isPublic: !!option.isPublic,
  value: `${STAKING_SORT_TAG_PREFIX}${option.value}`,
}))
const STAKING_TAG_DEFAULT = STAKING_SORT_OPTIONS[0]!.value
const TAG_DEFAULT = STAKING_TAG_DEFAULT

function getIsDefaultTagId(id: string) {
  return id === TAG_DEFAULT
}

function getIsLocalHistoriesTagId(id: string) {
  return id === 'local-histories'
}

function getIsStakingTagId(id: string) {
  return id.startsWith(STAKING_SORT_TAG_PREFIX)
}

const tagId = computed({
  get: () => getRouteQuery('tag', TAG_DEFAULT),
  set: async (id) => {
    if (getIsLocalHistoriesTagId(id)) {
      await navigateTo(localeRoute({ name: 'local-histories' }))
      return
    }
    await navigateTo(localeRoute({
      name: routeName.value,
      query: {
        ...route.query,
        ll_medium: `tag-${id}`,
        // NOTE: Remove the tag query if it is the listing tag
        tag: getIsDefaultTagId(id) ? undefined : id,
      },
    }))
  },
})
const isDefaultTagId = computed(() => getIsDefaultTagId(tagId.value))
const isStakingTagId = computed(() => getIsStakingTagId(tagId.value))

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

const normalizedLocale = computed(() => locale.value === 'zh-Hant' ? 'zh' : 'en')

function getStakingTagLabel(tagId: string) {
  const suffix = tagId.slice(STAKING_SORT_TAG_PREFIX.length) || 'total-staked'
  switch (suffix) {
    case 'staker-count':
      return $t('staking_explore_sort_staker_count')
    case 'recent':
      return $t('staking_explore_sort_recent')
    case 'total-staked':
    default:
      return $t('staking_explore_sort_total_staked')
  }
}

const activeCMSTag = computed(() => {
  return bookstoreStore.getBookstoreCMSTagById(tagId.value)
})

function getTagTo(value: string) {
  if (value === 'local-histories') {
    return localeRoute({ name: 'local-histories' })
  }
  return localeRoute({
    name: routeName.value,
    query: {
      ...route.query,
      tag: getIsDefaultTagId(value) ? undefined : value,
    },
  })
}

const allTagItems = computed(() => {
  const stakingTags = STAKING_SORT_OPTIONS
    .map(option => ({
      ...option,
      label: getStakingTagLabel(option.value),
    }))
    .filter(option => tagId.value === option.value || option.isPublic)

  // Built-in list types (latest/free/drm-free) are mirrored as CMS tags so editors
  // control their ordering here, hence they surface through cmsTags like any other tag.
  const cmsTags = bookstoreStore.bookstoreCMSTags
    .filter((tag) => {
      return !!tag.isPublic || tag.id === tagId.value
    })
    .map(tag => ({
      label: tag.name[normalizedLocale.value],
      value: tag.id,
    }))

  // Always surface the active CMS tag even if it's absent from the cached list
  // (e.g. a newly created tag not yet reflected in the cached tag list).
  if (
    activeCMSTag.value
    && !cmsTags.some(t => t.value === activeCMSTag.value!.id)
  ) {
    cmsTags.push({
      label: activeCMSTag.value.name[normalizedLocale.value],
      value: activeCMSTag.value.id,
    })
  }

  // Local histories is a store-only entry; the library tab omits it.
  const visibleCMSTags = isLibraryTab.value
    ? cmsTags.filter(tag => !getIsLocalHistoriesTagId(tag.value))
    : cmsTags

  // On mobile, pin the local-histories CMS tag last.
  const ordered = [...stakingTags, ...visibleCMSTags]
  if (isMobile.value) {
    const localHistoriesIndex = ordered.findIndex(tag => getIsLocalHistoriesTagId(tag.value))
    if (localHistoriesIndex !== -1) {
      ordered.push(...ordered.splice(localHistoriesIndex, 1))
    }
  }

  return ordered.map(item => ({
    ...item,
    to: getTagTo(item.value),
  }))
})

function mapTagIdToAPIStakingSortValue(tagId: string): 'staked_amount' | 'last_staked_at' | 'number_of_stakers' {
  const suffix = tagId.slice(STAKING_SORT_TAG_PREFIX.length) || 'total-staked'
  switch (suffix) {
    case 'staker-count':
      return 'number_of_stakers'
    case 'recent':
      return 'last_staked_at'
    case 'total-staked':
    default:
      return 'staked_amount'
  }
}

const tagName = computed(() => {
  if (isStakingTagId.value) {
    return getStakingTagLabel(tagId.value)
  }
  return activeCMSTag.value?.name[normalizedLocale.value] || ''
})

const searchModeContext = computed(() => {
  if (!isSearchMode.value) return null
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

const searchResults = computed<BookstoreItemList | null>(() => {
  if (isSearchMode.value) {
    const searchResults = bookstoreStore.getBookstoreSearchResultsByQuery(searchQuery.value)
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

  const listingProducts = bookstoreStore.getBookstoreCMSProductsByTagId(tagId.value)
  const items = listingProducts.items.map((item) => {
    const stakingInfo = stakingData[item.classId?.toLowerCase() || '']
    return {
      ...item,
      totalStaked: stakingInfo?.totalStaked ?? 0n,
      stakerCount: stakingInfo?.stakerCount ?? 0,
      likeRank: stakingInfo?.likeRank ?? 0,
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
// flag inline; staking/search items fall back to already-loaded BookstoreInfo.
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

const products = computed<BookstoreItemList>(() => {
  if (!isLibraryTab.value) return baseProducts.value
  return {
    ...baseProducts.value,
    items: baseProducts.value.items.filter(getIsPlusReading),
  }
})

const itemsCount = computed(() => products.value.items.length)
const hasMoreItems = computed(() => !!products.value.nextItemsKey || !!products.value.mayHaveMore || !products.value.hasFetchedItems)

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

  if (isSearchResultEmpty.value) {
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
      : [{
          rel: 'preload',
          href: `/api/store/products?tag=${encodedTagId}&limit=${MAX_BOOKSTORE_PAGE_SIZE}&ts=${getTimestampRoundedToMinute()}`,
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
watch([querySearchTerm, queryAuthorName, queryPublisherName, queryOwnerWallet, queryGenre], async () => {
  if (isSearchMode.value) {
    await fetchItems({ lazy: true })
  }
})

watch(queryOwnerWallet, async (wallet) => {
  if (wallet) {
    try {
      await metadataStore.lazyFetchLikerInfoByWalletAddress(wallet)
    }
    catch (error) {
      console.error('Failed to fetch wallet info:', error)
    }
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
  const apiSortValue = mapTagIdToAPIStakingSortValue(isStakingTagId.value ? currentTagId : STAKING_TAG_DEFAULT)

  if (isStakingTagId.value) {
    await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 })
    return
  }

  // Fetch staking books first so CMS tag items can be sorted by staking
  await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 }).catch((error) => {
    console.warn('[store] Failed to fetch staking data for CMS tag sorting:', error)
  })

  // Capture the items array reference before fetch so we can detect
  // if the store replaced it (e.g. on refresh or expired-offset retry)
  const itemsBefore = bookstoreStore.bookstoreCMSProductsByTagIdMap[currentTagId]?.items
  const countBefore = isRefresh ? 0 : (itemsBefore?.length ?? 0)
  await bookstoreStore.fetchCMSProductsByTagId(currentTagId, { isRefresh })

  // Sort only the new batch by staking amount (skip 'latest' which preserves Airtable order)
  if (currentTagId !== 'latest') {
    const items = bookstoreStore.bookstoreCMSProductsByTagIdMap[currentTagId]?.items
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
      if (type && searchTerm) {
        await bookstoreStore.fetchSearchResults(type as 'q' | 'author' | 'publisher' | 'owner_wallet' | 'genre', searchTerm, { isRefresh })
      }
      return true
    }
    catch (error) {
      if (!isOnline.value) return false
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
    if (!isOnline.value) return false
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
  // Gate /library behind the `plus-library` flag. PostHog is client-only, so
  // evaluate after mount and redirect to /store when disabled.
  if (isLibraryTab.value && !(await fetchFeatureFlagEnabled('plus-library'))) {
    await navigateTo(localeRoute({ name: 'store' }), { replace: true })
    return
  }

  if (!route.query.tag && !isSearchMode.value) {
    await storePageState.restoreIfNeeded()
  }

  if (isSearchMode.value) {
    const promises: Promise<unknown>[] = [
      fetchItems({ lazy: true }),
      fetchTagItems().catch(() => {
        // Ignore errors when fetching tag items in search mode
      }),
    ]

    if (queryOwnerWallet.value) {
      promises.push(
        metadataStore.lazyFetchLikerInfoByWalletAddress(queryOwnerWallet.value)
          .catch((error) => {
            console.error('Failed to fetch wallet info:', error)
          }),
      )
    }

    await Promise.all(promises)
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

  if (tagValue === 'local-histories') {
    useLogEvent('store_tag_click', { tag_id: tagValue })
    await navigateTo(localeRoute({ name: 'local-histories' }))
    return
  }

  useLogEvent('store_tag_click', { tag_id: tagValue })
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

const isSearchInputOpen = ref(false)
const searchInputValue = ref('')

function handleSearchTagClick() {
  useLogEvent('store_tag_search_click')
  searchInputValue.value = ''
}

function handleClearSearchInputButton() {
  useLogEvent('store_search_input_clear_button_click')
  searchInputValue.value = ''
}

function handleContactUsClick() {
  useLogEvent('store_no_search_results_contact_click', { search_term: querySearchTerm.value })
  const searchTerm = querySearchTerm.value || queryAuthorName.value || queryPublisherName.value || queryOwnerWallet.value
  intercom.showNewMessage($t('store_no_search_results_contact_prefill', { term: searchTerm }))
}

async function handleSearchSubmit() {
  if (!searchInputValue.value) return

  isSearchInputOpen.value = false
  let query = 'q'
  if (checkIsEVMAddress(searchInputValue.value)) {
    query = 'owner_wallet'
  }
  useLogEvent('store_search_submit')
  await navigateTo({ query: { [query]: searchInputValue.value } })
}
</script>
