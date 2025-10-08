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
        class="flex items-center w-full"
      >
        <h1 class="text-xl laptop:text-2xl font-bold text-gray-900">
          <span v-if="querySearchTerm">{{ $t('store_search_prefix') }}: {{ querySearchTerm }}</span>
          <span v-else-if="queryAuthorName">{{ $t('store_author_prefix') }}: {{ queryAuthorName }}</span>
          <span v-else-if="queryPublisherName">{{ $t('store_publisher_prefix') }}: {{ queryPublisherName }}</span>
        </h1>
      </div>

      <!-- Normal tag selector -->
      <div
        v-else
        class="flex items-center max-phone:gap-1 gap-2 w-full"
      >
        <UButton
          v-if="!isDefaultTagId"
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
          v-model="tagId"
          :placeholder="isDefaultTagId ? $t('store_tag_more_categories') : undefined"
          :items="isDefaultTagId ? selectorTagItems : allTagItems"
          :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 8,
          }"
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
        v-if="itemsCount === 0 && !products.isFetchingItems && products.hasFetchedItems"
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
        v-else
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
const { t: $t, locale } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteQuery = useRouteQuery()
const runtimeConfig = useRuntimeConfig()
const bookstoreStore = useBookstoreStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const isMobile = useMediaQuery('(max-width: 768px)')

const querySearchTerm = computed(() => getRouteQuery('q', ''))
const queryAuthorName = computed(() => getRouteQuery('author', ''))
const queryPublisherName = computed(() => getRouteQuery('publisher', ''))

// Search query key for bookstore store
const searchQuery = computed(() => {
  if (querySearchTerm.value) return `q:${querySearchTerm.value}`
  if (queryAuthorName.value) return `author:${queryAuthorName.value}`
  if (queryPublisherName.value) return `publisher:${queryPublisherName.value}`
  return ''
})

const isSearchMode = computed(() => !!searchQuery.value)

const TAG_LISTING = 'listing'

function getIsDefaultTagId(id: string) {
  return id === TAG_LISTING
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

const normalizedLocale = computed(() => locale.value === 'zh-Hant' ? 'zh' : 'en')

const allTagItems = computed(() => {
  return bookstoreStore.bookstoreCMSTags
    .filter((tag) => {
      return !!tag.isPublic || tag.id === tagId.value
    })
    .map(tag => ({
      label: tag.name[normalizedLocale.value],
      value: tag.id,
    }))
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

const selectorTagItems = computed(() => {
  return allTagItems.value.slice(tagsSliceIndex.value)
})

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
watch([querySearchTerm, queryAuthorName, queryPublisherName], async () => {
  if (isSearchMode.value) {
    await fetchItems({ lazy: true })
  }
})

const products = computed(() => {
  if (isSearchMode.value) {
    return bookstoreStore.getBookstoreSearchResultsByQuery(searchQuery.value)
  }
  return bookstoreStore.getBookstoreCMSProductsByTagId(localizedTagId.value)
})
const itemsCount = computed(() => products.value.items.length)
const hasMoreItems = computed(() => !!products.value.nextItemsKey || !products.value.hasFetchedItems)

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

const isFetchingTags = ref(true)

async function fetchTags() {
  try {
    isFetchingTags.value = true
    await bookstoreStore.fetchBookstoreCMSTags()
  }
  catch (error) {
    await handleError(error, {
      title: $t('store_fetch_tags_error'),
    })
  }
  finally {
    isFetchingTags.value = false
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
        await bookstoreStore.fetchSearchResults(type as 'q' | 'author' | 'publisher', searchTerm, { isRefresh })
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
    // In search mode, skip tag fetching and just fetch search results
    await fetchItems({ lazy: true })
    return
  }

  const fetchTagPromise = fetchTags()
  if (!isDefaultTagId.value) {
    // NOTE: Need to fetch all tags if not the default tag
    await fetchTagPromise
    if (!tag.value) {
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
