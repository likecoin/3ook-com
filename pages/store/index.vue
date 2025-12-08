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
        <UButton
          :to="localeRoute({ name: 'store' })"
          icon="i-material-symbols-close-rounded"
          variant="outline"
          :ui="{ base: [TAG_BUTTON_CLASS_LIGHT, TAG_BUTTON_CLASS_BASE] }"
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
          class="px-3 py-1 text-theme-cyan font-medium bg-theme-black rounded-full"
        >
          <span v-if="querySearchTerm">{{ $t('store_search_prefix') }}{{ querySearchTerm }}</span>
          <span v-else-if="queryAuthorName">{{ $t('store_author_prefix') }}{{ queryAuthorName }}</span>
          <span v-else-if="queryPublisherName">{{ $t('store_publisher_prefix') }}{{ queryPublisherName }}</span>
        </h1>
      </div>

      <!-- Tag selector -->
      <div
        v-else
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
          :ui="{
            base: [TAG_BUTTON_CLASS_LIGHT, TAG_BUTTON_CLASS_BASE],
            leadingIcon: 'laptop:size-6',
          }"
          @click="handleCloseTagClick"
        />

        <UButton
          v-for="fixedTag in fixedTags"
          v-else
          :key="fixedTag.value"
          :label="fixedTag.label"
          variant="outline"
          :ui="{
            base: [
              fixedTag.value === TAG_DEFAULT ? TAG_BUTTON_CLASS_DARK : TAG_BUTTON_CLASS_LIGHT,
              TAG_BUTTON_CLASS_BASE,
              'px-2.5 laptop:px-4',
              '!ring-theme-black',
            ],
            label: 'text-sm laptop:text-base',
          }"
          :to="localeRoute({ name: 'store', query: { ...route.query, tag: fixedTag.value } })"
          @click.prevent="handleTagClick(fixedTag.value)"
        />

        <UModal
          v-if="bookstoreStore.hasFetchedBookstoreCMSTags && isDefaultTagId"
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
          <UButton
            icon="i-material-symbols-search-rounded"
            variant="outline"
            :ui="{
              base: [TAG_BUTTON_CLASS_LIGHT, TAG_BUTTON_CLASS_BASE],
              leadingIcon: 'laptop:size-6',
            }"
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
          v-if="bookstoreStore.hasFetchedBookstoreCMSTags && isDefaultTagId"
          :text="$t('book_list_title')"
        >
          <UButton
            icon="i-material-symbols-favorite-outline-rounded"
            variant="outline"
            :ui="{
              base: [TAG_BUTTON_CLASS_LIGHT, TAG_BUTTON_CLASS_BASE],
              leadingIcon: 'laptop:size-6 translate-y-[1px]',
            }"
            :to="localeRoute({ name: 'list' })"
            @click="handleBookListTagClick"
          />
        </UTooltip>

        <div
          v-if="bookstoreStore.hasFetchedBookstoreCMSTags"
          class="relative group rounded-full"
        >
          <template v-if="isDefaultTagId">
            <!-- Dummy button -->
            <UButton
              icon="i-material-symbols-keyboard-arrow-down-rounded"
              variant="outline"
              :ui="{
                base: [
                  TAG_BUTTON_CLASS_LIGHT,
                  TAG_BUTTON_CLASS_BASE,
                  'group-hover:-translate-y-0.5',
                  'pointer-events-none',
                ],
                leadingIcon: 'laptop:size-6 translate-y-[1px]',
              }"
            />
            <!-- Real select -->
            <select
              v-model="tagId"
              class="absolute inset-0 opacity-0 rounded-full cursor-pointer"
            >
              <option
                v-for="tag in selectorTagItems"
                :key="tag.value"
                :value="tag.value"
                v-text="tag.label"
              />
            </select>
          </template>
          <!-- Selected tag (dummy button) -->
          <UButton
            v-else
            :label="activeTag?.label"
            :ui="{
              base: [
                TAG_BUTTON_CLASS_BASE,
                'px-2.5 laptop:px-4',
                'pointer-events-none',
              ],
              label: 'text-sm laptop:text-base',
            }"
          />
        </div>
      </div>
    </header>

    <main
      class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16"
    >
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
          :total-staked="Number(formatUnits(item.totalStaked ?? 0n, likeCoinTokenDecimals))"
          :staker-count="item.stakerCount ?? 0"
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

const { likeCoinTokenDecimals } = useRuntimeConfig().public
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
const isTablet = useMediaQuery('(max-width: 768px)')
const isMobile = useMediaQuery('(max-width: 425px)')

const TAG_BUTTON_CLASS_BASE = 'rounded-full hover:-translate-y-0.5 transition-all'
const TAG_BUTTON_CLASS_LIGHT = 'bg-(--app-bg) hover:bg-theme-white/80'
const TAG_BUTTON_CLASS_DARK = 'bg-theme-black hover:bg-theme-black/80 text-theme-cyan'

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

function getIsStakingTagId(id: string) {
  return id.startsWith(STAKING_SORT_TAG_PREFIX)
}

const tagId = computed({
  get: () => getRouteQuery('tag', TAG_DEFAULT),
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

const allTagItems = computed(() => {
  const stakingTags = STAKING_SORT_OPTIONS
    .map(option => ({
      ...option,
      label: getStakingTagLabel(option.value),
    }))
    .filter(option => tagId.value === option.value || option.isPublic)

  const cmsTags = bookstoreStore.bookstoreCMSTags
    .filter((tag) => {
      return !!tag.isPublic || tag.id === tagId.value
    })
    .map(tag => ({
      label: tag.name[normalizedLocale.value],
      value: tag.id,
    }))

  return [
    ...stakingTags,
    ...cmsTags,
  ]
})

const tagsSliceIndex = computed(() => {
  if (locale.value === 'zh-Hant') {
    if (isMobile.value) {
      return 3
    }
    if (isTablet.value) {
      return 4
    }
    return 8
  }
  if (isMobile.value) {
    return 2
  }
  if (isTablet.value) {
    return 3
  }
  return 5
})

const fixedTags = computed(() => {
  return allTagItems.value.slice(0, tagsSliceIndex.value)
})

const activeTag = computed(() => {
  return allTagItems.value.find(tag => tag.value === tagId.value)
})

const activeCMSTag = computed(() => {
  return bookstoreStore.getBookstoreCMSTagById(tagId.value)
})

const selectorTagItems = computed(() => {
  if (!bookstoreStore.hasFetchedBookstoreCMSTags && activeCMSTag.value) {
    return [
      {
        label: activeCMSTag.value.name[normalizedLocale.value],
        value: activeCMSTag.value.id,
      },
    ]
  }
  return isDefaultTagId.value ? allTagItems.value.slice(tagsSliceIndex.value) : allTagItems.value
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

const tagDescription = computed(() => {
  if (isStakingTagId.value) return ''
  return activeCMSTag.value?.description[normalizedLocale.value] || ''
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
    ...(isStakingTagId.value
      ? [{
          rel: 'preload',
          href: `${runtimeConfig.public.likeCoinEVMChainCollectiveAPIEndpoint}/book-nfts/1y/delta?pagination.limit=100&sort_by=${mapTagIdToAPIStakingSortValue(tagId.value)}&sort_order=desc`,
          as: 'fetch' as const,
          crossorigin: 'anonymous' as const,
        }]
      : [{
          rel: 'preload',
          href: `/api/store/products?tag=${tagId.value}&limit=100&ts=${getTimestampRoundedToMinute()}`,
          as: 'fetch' as const,
        }]),
  ]

  return {
    title: [$t('store_page_title'), tagName.value].join('›'),
    meta,
    link,
  }
})

watch(tagId, async (value) => {
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
  const stakingData = bookstoreStore.getStakingBooks(apiSortValue).items.reduce((map, item) => {
    map[item.nftClassId.toLowerCase()] = {
      totalStaked: item.totalStaked,
      stakerCount: item.stakerCount,
    }
    return map
  }, {} as Record<string, { totalStaked: bigint, stakerCount: number }>)

  const listingProducts = bookstoreStore.getBookstoreCMSProductsByTagId(tagId.value)
  const items = listingProducts.items.map((item) => {
    const stakingInfo = stakingData[item.classId?.toLowerCase() || '']
    return {
      ...item,
      totalStaked: stakingInfo?.totalStaked ?? 0n,
      stakerCount: stakingInfo?.stakerCount ?? 0,
    }
  })

  if (tagId.value !== 'latest') {
    items.sort((a, b) => {
      const aTotalStaked = a.totalStaked ?? 0n
      const bTotalStaked = b.totalStaked ?? 0n
      return Number(bTotalStaked - aTotalStaked)
    })
  }

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

const products = computed<BookstoreItemList>(() => {
  if (searchResults.value && !isSearchResultEmpty.value) {
    return searchResults.value
  }

  // Return staking books when viewing staking tag
  if (isStakingTagId.value) {
    const apiSortValue = mapTagIdToAPIStakingSortValue(tagId.value)
    const staking = bookstoreStore.getStakingBooks(apiSortValue)
    const items: BookstoreItem[] = []
    staking.items.forEach((item) => {
      const bookInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.nftClassId)
      if (bookInfo?.isHidden) return
      items.push({
        id: item.nftClassId,
        classId: item.nftClassId,
        title: bookInfo?.name || '',
        imageUrl: bookInfo?.thumbnailUrl || '',
        minPrice: undefined,
        totalStaked: item.totalStaked,
        stakerCount: item.stakerCount,
      })
    })
    return {
      items,
      isFetchingItems: staking.isFetchingItems,
      hasFetchedItems: staking.hasFetchedItems,
      nextItemsKey: staking.nextItemsKey,
    }
  }

  return cmsProducts.value
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

async function fetchTagItems({ isRefresh = false } = {}) {
  const apiSortValue = mapTagIdToAPIStakingSortValue(isStakingTagId.value ? tagId.value : STAKING_TAG_DEFAULT)
  const fetchPromises = [
    // NOTE: Fetch staking books for sorting CMS tag items by staking
    bookstoreStore.fetchStakingBooks(apiSortValue, { isRefresh, limit: 100 }).catch((error) => {
      if (isStakingTagId.value) {
        throw error
      }
    }),
  ]
  if (!isStakingTagId.value) {
    fetchPromises.push(bookstoreStore.fetchCMSProductsByTagId(tagId.value, { isRefresh }))
  }
  await Promise.all(fetchPromises)
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

  try {
    await fetchTagItems({ isRefresh })
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

watch(
  shouldLoadMore,
  async (shouldLoadMore) => {
    if (shouldLoadMore) {
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

async function handleCloseTagClick() {
  useLogEvent('store_tag_close_click')
  tagId.value = TAG_DEFAULT
}

async function handleBookListTagClick() {
  useLogEvent('store_tag_book_list_click')
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
