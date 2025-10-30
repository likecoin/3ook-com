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
        class="flex items-center gap-4 w-full"
      >
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
            <p class="text-xs text-gray-500 uppercase tracking-wide">
              {{ $t('store_owner_wallet_prefix') }}
            </p>
            <h1 class="text-xl laptop:text-2xl font-bold text-gray-900 truncate">
              {{ ownerWalletDisplayName || queryOwnerWallet }}
            </h1>
          </div>
        </div>
        <h1
          v-else
          class="text-xl laptop:text-2xl font-bold text-gray-900"
        >
          <span v-if="querySearchTerm">{{ $t('store_search_prefix') }}: {{ querySearchTerm }}</span>
          <span v-else-if="queryAuthorName">{{ $t('store_author_prefix') }}: {{ queryAuthorName }}</span>
          <span v-else-if="queryPublisherName">{{ $t('store_publisher_prefix') }}: {{ queryPublisherName }}</span>
        </h1>
      </div>

      <!-- Tag selector -->
      <div
        class="flex items-center max-phone:gap-1 gap-2 w-full"
      >
        <template v-if="!bookstoreStore.hasFetchedBookstoreCMSTags && isDefaultTagId">
          <USkeleton
            v-for="(widthClass, i) in ['w-20', 'w-18', 'w-24', 'w-16']"
            :key="`tag-skeleton-${i + 1}`"
            :class="[
              'shrink-0',
              widthClass,
              'h-8 laptop:h-9',
              'rounded-full',
              'border-2',
              'border-muted',
            ]"
          />
        </template>

        <UButton
          v-else-if="!isDefaultTagId"
          icon="i-material-symbols-close-rounded"
          variant="outline"
          rounded-full
          :ui="{ base: 'rounded-full bg-(--app-bg) hover:bg-theme-white/80 hover:-translate-y-0.5 transition-all' }"
          @click="handleCloseClick"
        />

        <UButton
          v-for="fixedTag in fixedTags"
          v-else
          :key="fixedTag.value"
          :label="fixedTag.label"
          variant="outline"
          :ui="{
            base: 'rounded-full bg-(--app-bg) hover:bg-theme-white/80 !ring-theme-black max-phone:px-[10px] px-4 hover:-translate-y-0.5 transition-all',
            label: 'text-sm laptop:text-base',
          }"
          :to="localeRoute({ name: 'store', query: { ...route.query, tag: fixedTag.value } })"
          @click.prevent="handleTagClick(fixedTag.value)"
        />

        <USelect
          v-if="bookstoreStore.hasFetchedBookstoreCMSTags || !isDefaultTagId || isStakingTagId"
          v-model="tagId"
          :placeholder="isDefaultTagId ? $t('store_tag_more_categories') : undefined"
          :items="selectorTagItems"
          :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 8,
          }"
          :disabled="!bookstoreStore.hasFetchedBookstoreCMSTags"
          arrow
          size="md"
          :ui="{
            base: [
              'rounded-full !ring-theme-black justify-center text-sm laptop:text-base font-medium max-phone:!pl-[10px] !pl-[16px] hover:-translate-y-0.5 transition-all',
              isDefaultTagId
                ? 'bg-(--app-bg) hover:bg-theme-white/80'
                : 'bg-theme-black hover:bg-theme-black/80 text-white',
            ],
            content: 'rounded-lg',
            placeholder: isDefaultTagId ? '!text-black text-sm laptop:text-base' : undefined,
          }"
        />
      </div>
    </header>

    <main
      class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16"
    >
      <div
        v-if="shouldShowDefaultListing"
        class="w-full mb-8"
      >
        <div class="flex flex-col items-center py-8">
          <UIcon
            class="opacity-20 mb-4"
            name="i-material-symbols-search-off"
            size="64"
          />
          <h2 class="text-xl font-bold text-gray-900 mb-2">
            {{ $t('store_no_search_results') }}
          </h2>
          <p class="text-gray-600 mb-4">
            {{ $t('store_showing_recommendations') }}
          </p>
        </div>
        <hr class="border-t border-gray-200">
      </div>

      <div
        v-if="!shouldShowDefaultListing && itemsCount === 0 && !products.isFetchingItems && products.hasFetchedItems"
        class="flex flex-col items-center m-auto"
      >
        <UIcon
          class="opacity-20"
          name="i-material-symbols-menu-book-outline-rounded"
          size="128"
        />

        <span
          class="font-bold opacity-20"
          v-text="$t('store_no_items')"
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
          :key="item.classId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.classId"
          :book-name="item.title"
          :book-cover-src="item.imageUrl"
          :price="item.minPrice"
          :total-staked="isStakingTagId ? Number(formatUnits(item.totalStaked ?? 0n, LIKE_TOKEN_DECIMALS)) : 0"
          :staker-count="isStakingTagId ? (item.stakerCount ?? 0) : 0"
          :lazy="index >= columnMax"
        />
      </ul>
      <div
        v-if="hasMoreItems"
        ref="infiniteScrollDetector"
        class="flex justify-center py-48"
      >
        <UIcon
          class="animate-spin"
          name="material-symbols-progress-activity"
          size="48"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { LIKE_TOKEN_DECIMALS } from '~/composables/use-likecoin-contract'

const { t: $t, locale } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteQuery = useRouteQuery()
const runtimeConfig = useRuntimeConfig()
const bookstoreStore = useBookstoreStore()
const metadataStore = useMetadataStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const isMobile = useMediaQuery('(max-width: 768px)')

const querySearchTerm = computed(() => getRouteQuery('q', ''))
const queryAuthorName = computed(() => getRouteQuery('author', ''))
const queryPublisherName = computed(() => getRouteQuery('publisher', ''))
const queryOwnerWallet = computed(() => getRouteQuery('owner_wallet', ''))

const ownerWalletAvatarSrc = computed(() => {
  if (!queryOwnerWallet.value) return ''
  return metadataStore.getLikerInfoByWalletAddress(queryOwnerWallet.value)?.avatarSrc || ''
})

const ownerWalletDisplayName = computed(() => {
  if (!queryOwnerWallet.value) return ''
  return metadataStore.getLikerInfoByWalletAddress(queryOwnerWallet.value)?.displayName || ''
})

// Search query key for bookstore store
const searchQuery = computed(() => {
  if (querySearchTerm.value) return `q:${querySearchTerm.value}`
  if (queryAuthorName.value) return `author:${queryAuthorName.value}`
  if (queryPublisherName.value) return `publisher:${queryPublisherName.value}`
  if (queryOwnerWallet.value) return `owner_wallet:${queryOwnerWallet.value}`
  return ''
})

const isSearchMode = computed(() => !!searchQuery.value)

const TAG_LISTING = 'listing'
const STAKING_SORT_TAG_PREFIX = 'staking-'

function getIsDefaultTagId(id: string) {
  return id === TAG_LISTING
}

function getIsStakingTagId(id: string) {
  return id.startsWith(STAKING_SORT_TAG_PREFIX)
}

const tagId = computed({
  get: () => getRouteQuery('tag', TAG_LISTING),
  set: async (id) => {
    await navigateTo(localeRoute({
      name: 'store',
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
  if (!tagId.value || isDefaultTagId.value || isStakingTagId.value) return
  await bookstoreStore.fetchBookstoreCMSTag(tagId.value)
})

const normalizedLocale = computed(() => locale.value === 'zh-Hant' ? 'zh' : 'en')

const allTagItems = computed(() => {
  const cmsTags = bookstoreStore.bookstoreCMSTags
    .filter((tag) => {
      return !!tag.isPublic || tag.id === tagId.value
    })
    .map(tag => ({
      label: tag.name[normalizedLocale.value],
      value: tag.id,
    }))

  const stakingTags = STAKING_SORT_OPTIONS.map(option => ({
    label: $t(option.labelKey),
    value: `${STAKING_SORT_TAG_PREFIX}${option.value}`,
  }))

  return [...cmsTags, ...stakingTags]
})

const tagsSliceIndex = computed(() => {
  if (locale.value === 'zh-Hant') {
    return isMobile.value ? 3 : 4
  }
  return isMobile.value ? 2 : 3
})

const fixedTags = computed(() => {
  return allTagItems.value.slice(0, tagsSliceIndex.value)
})

const activeTag = computed(() => {
  return bookstoreStore.getBookstoreCMSTagById(tagId.value)
})

const selectorTagItems = computed(() => {
  if (!bookstoreStore.hasFetchedBookstoreCMSTags && activeTag.value) {
    return [
      {
        label: activeTag.value.name[normalizedLocale.value],
        value: activeTag.value.id,
      },
    ]
  }
  return isDefaultTagId.value ? allTagItems.value.slice(tagsSliceIndex.value) : allTagItems.value
})

const STAKING_SORT_OPTIONS = [
  { value: 'total_staked', labelKey: 'staking_explore_sort_total_staked' },
  { value: 'staker_count', labelKey: 'staking_explore_sort_staker_count' },
  { value: 'recent', labelKey: 'staking_explore_sort_recent' },
]

function mapToAPIStakingSortValue(sortValue: string): 'staked_amount' | 'last_staked_at' | 'number_of_stakers' {
  switch (sortValue) {
    case 'total_staked':
      return 'staked_amount'
    case 'staker_count':
      return 'number_of_stakers'
    case 'recent':
      return 'last_staked_at'
    default:
      return 'staked_amount'
  }
}

const localizedTagId = computed(() => {
  // NOTE: Only the default tag is localized
  return isDefaultTagId.value ? `${tagId.value}-${normalizedLocale.value}` : tagId.value
})

const tag = computed(() => {
  return bookstoreStore.getBookstoreCMSTagById(localizedTagId.value)
})

const tagName = computed(() => {
  return isDefaultTagId.value ? $t('store_tag_listing') : tag.value?.name[normalizedLocale.value] || ''
})

const tagDescription = computed(() => {
  return tag.value?.description[normalizedLocale.value] || ''
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

  const queryString = canonicalParams.toString()
  return `${baseURL}${path}${queryString ? `?${queryString}` : ''}`
})

useHead(() => {
  const meta = []
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

  const link = [
    {
      rel: 'canonical',
      href: canonicalURL.value,
    },
    {
      rel: 'preload',
      href: '/api/store/tags',
      as: 'fetch' as const,
    },
    {
      rel: 'preload',
      href: `/api/store/products?tag=${localizedTagId.value}&limit=100&ts=${getTimestampRoundedToMinute()}`,
      as: 'fetch' as const,
    },
  ]

  return {
    title: [$t('store_page_title'), tagName.value].join('›'),
    meta,
    link,
  }
})

watch(localizedTagId, async (value) => {
  if (value) {
    await fetchItems({ lazy: true })
  }
})

// Watch for changes in search parameters
watch([querySearchTerm, queryAuthorName, queryPublisherName, queryOwnerWallet], async () => {
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

const searchResults = computed(() => {
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

const defaultListingProducts = computed(() => {
  return bookstoreStore.getBookstoreCMSProductsByTagId(localizedTagId.value)
})

const hasSearchResults = computed(() => {
  return searchResults.value && searchResults.value.items.length > 0
})

const shouldShowDefaultListing = computed(() => {
  return isSearchMode.value && !hasSearchResults.value && searchResults.value?.hasFetchedItems
})

const products = computed(() => {
  if (isSearchMode.value) {
    if (hasSearchResults.value && searchResults.value) {
      return searchResults.value
    }

    if (shouldShowDefaultListing.value) {
      return defaultListingProducts.value
    }

    return searchResults.value || defaultListingProducts.value
  }

  // Return staking books when viewing staking tag
  if (isStakingTagId.value) {
    const stakingSort = tagId.value.slice(STAKING_SORT_TAG_PREFIX.length) || 'total_staked'
    const apiSortValue = mapToAPIStakingSortValue(stakingSort)
    const staking = bookstoreStore.getStakingBooks(apiSortValue)
    return {
      items: staking.items.map((item) => {
        const bookInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.nftClassId)
        return {
          classId: item.nftClassId,
          title: bookInfo?.name || '',
          imageUrl: bookInfo?.thumbnailUrl || '',
          minPrice: undefined,
          totalStaked: item.totalStaked,
          stakerCount: item.stakerCount,
        }
      }),
      isFetchingItems: staking.isFetchingItems,
      hasFetchedItems: staking.hasFetchedItems,
      nextItemsKey: staking.nextItemsKey,
    }
  }

  return defaultListingProducts.value
})

const itemsCount = computed(() => products.value.items.length)
const hasMoreItems = computed(() => !!products.value.nextItemsKey || !products.value.hasFetchedItems)

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

async function fetchTags() {
  try {
    await bookstoreStore.fetchBookstoreCMSTags()
  }
  catch (error) {
    await handleError(error, {
      title: $t('store_fetch_tags_error'),
    })
  }
}

async function fetchItems({ lazy = false, isRefresh = false } = {}) {
  if (lazy && products.value.items.length > 0) {
    return
  }
  if (isSearchMode.value) {
    try {
      const [type, searchTerm] = searchQuery.value.split(':', 2)
      if (type && searchTerm) {
        await bookstoreStore.fetchSearchResults(type as 'q' | 'author' | 'publisher' | 'owner_wallet', searchTerm, { isRefresh })
      }
    }
    catch (error) {
      await handleError(error, {
        title: isRefresh ? $t('store_fetch_items_error') : $t('store_fetch_more_items_error'),
      })
    }
    return
  }

  if (isStakingTagId.value) {
    const stakingSort = tagId.value.slice(STAKING_SORT_TAG_PREFIX.length) || 'total_staked'
    const apiSortValue = mapToAPIStakingSortValue(stakingSort)
    try {
      await bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh })
    }
    catch (error) {
      await handleError(error, {
        title: $t('staking_explore_fetch_error'),
      })
    }
    return
  }

  try {
    await bookstoreStore.fetchCMSProductsByTagId(localizedTagId.value, { isRefresh })
  }
  catch (error) {
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
  }
}

onMounted(async () => {
  if (isSearchMode.value) {
    const promises: Promise<unknown>[] = [
      fetchItems({ lazy: true }),
      bookstoreStore.fetchCMSProductsByTagId(localizedTagId.value, { isRefresh: false }),
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

  const fetchTagPromise = fetchTags()
  if (!isDefaultTagId.value) {
    // NOTE: Need to fetch all tags if not the default tag
    await fetchTagPromise
    if (!tag.value && !isStakingTagId.value) {
      throw createError({
        statusCode: 404,
        message: $t('error_page_not_found'),
        fatal: true,
      })
    }
  }

  await Promise.all([
    fetchTagPromise,
    fetchItems({ lazy: true }),
  ])
})

watch(
  tag,
  async (tag) => {
    if (tag) {
      await fetchItems({ lazy: true })
    }
  },
)

watch(
  () => shouldLoadMore.value,
  async (shouldLoadMore) => {
    if (shouldLoadMore && (tag.value || isSearchMode.value)) {
      await fetchItems()
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
  useLogEvent('store_tag_click', { tag_id: tagValue })
  tagId.value = tagValue
}

async function handleCloseClick() {
  useLogEvent('store_tag_close_click', { tag_id: tagId.value })
  tagId.value = TAG_LISTING
}
</script>
