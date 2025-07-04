<template>
  <div class="relative flex flex-col grow">
    <AppHeader />

    <header
      :class="[
        'sticky',
        'z-1',
        'top-0',

        ...gridClasses,
        'gap-4',

        'w-full',
        'max-w-[1440px]',
        'mx-auto',
        'px-4 laptop:px-12',
        'py-4',

        'bg-linear-to-b from-(--app-bg)/90 to-(--app-bg)/0',
      ]"
    >
      <div
        class="relative col-span-3 tablet:col-span-2"
      >
        <span
          :class="[
            'absolute',
            'inset-0',
            'translate-y-[3px]',
            'rounded-full',
            'bg-theme-500',
            'text-theme-50',
            'shadow-[inset_3px_7px_4px_0px_#50E3C2E5]',
            { 'opacity-75': isFetchingTags },
          ]"
        />
        <span
          :class="[
            'absolute',
            'inset-0',
            'translate-x-[2px]',
            'bg-(--app-bg)',
            'rounded-full',
          ]"
        />
        <USelect
          v-model="tagId"
          class="relative w-full ml-[2px]"
          :items="tagItems"
          icon="i-material-symbols-format-list-bulleted-rounded"
          variant="outline"
          color="primary"
          size="lg"
          :loading="isFetchingTags"
          :disabled="isFetchingTags"
          highlight
          :ui="{
            base: 'rounded-full shadow-lg bg-(--app-bg)',
            content: 'rounded-lg ring-primary ring-2',
          }"
          @update:model-value="handleTagSelectChange"
        />
      </div>
    </header>

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16">
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
const bookstoreStore = useBookstoreStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()

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
        // NOTE: Remove the tag query if it is the listing tag
        tag: getIsDefaultTagId(id) ? undefined : id,
      },
    }))
  },
})
const isDefaultTagId = computed(() => getIsDefaultTagId(tagId.value))

const normalizedLocale = computed(() => locale.value === 'zh-Hant' ? 'zh' : 'en')

const tagItems = computed(() => {
  return [
    // NOTE: Inject the listing tag at first
    {
      label: $t('store_tag_listing'),
      value: TAG_LISTING,
    },
    ...bookstoreStore.bookstoreCMSTags
      .filter((tag) => {
        // NOTE: Filter out the unlisted tag if it is not selected
        return !!tag.isPublic || tag.id === tagId.value
      })
      .map(tag => ({
        label: tag.name[normalizedLocale.value],
        value: tag.id,
      })),
  ]
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
    await fetchItems({ isRefresh: true })
  }
})

const products = computed(() => bookstoreStore.getBookstoreCMSProductsByTagId(localizedTagId.value))
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

async function fetchItems({ isRefresh = false } = {}) {
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
    fetchItems({ isRefresh: true }),
  ])
})

watch(
  tag,
  async (tag) => {
    if (tag) {
      await fetchItems({ isRefresh: true })
    }
  },
)

watch(
  () => shouldLoadMore.value,
  async (shouldLoadMore) => {
    if (shouldLoadMore && tag.value) {
      await fetchItems()
    }
  },
)

async function handleFetchItemsErrorRetryButtonClick() {
  useLogEvent('store_fetch_items_error_retry', { tag_id: tagId.value })
  window.scrollTo({ top: 0 })
  await fetchItems({ isRefresh: true })
}

function handleTagSelectChange(value?: string) {
  useLogEvent('store_tag_select', { tag_id: value })
}
</script>
