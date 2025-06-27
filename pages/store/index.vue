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
      <USelect
        v-model="tagId"
        class="col-span-3 tablet:col-span-2"
        :items="tagItems"
        icon="i-material-symbols-format-list-bulleted-rounded"
        variant="subtle"
        color="secondary"
        size="lg"
        :ui="{
          base: 'rounded-lg shadow-lg',
          content: 'rounded-lg',
        }"
        @update:model-value="handleTagSelectChange"
      />
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

await callOnce(async () => {
  await bookstoreStore.fetchBookstoreCMSTags()
})

const TAG_LISTING = 'listing'

const tagId = computed({
  get: () => getRouteQuery('tag', TAG_LISTING),
  set: async (id) => {
    await navigateTo(localeRoute({
      name: 'store',
      query: {
        ...route.query,
        // NOTE: Remove the tag query if it is the listing tag
        tag: id === TAG_LISTING ? undefined : id,
      },
    }))
  },
})

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
  // NOTE: Only listing tag is localized
  return tagId.value === TAG_LISTING ? `${tagId.value}-${normalizedLocale.value}` : tagId.value
})

const tag = computed(() => {
  return bookstoreStore.getBookstoreCMSTagById(localizedTagId.value)
})

const tagName = computed(() => {
  return tagId.value === TAG_LISTING ? $t('store_tag_listing') : tag.value?.name[normalizedLocale.value] || ''
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
  return {
    title: [$t('store_page_title'), tagName.value].join('›'),
    meta,
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

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

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
  await fetchItems({ isRefresh: true })
})

watch(
  () => shouldLoadMore.value,
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

function handleTagSelectChange(value?: string) {
  useLogEvent('store_tag_select', { tag_id: value })
}
</script>
