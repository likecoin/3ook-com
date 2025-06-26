<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto px-4 laptop:px-12 pb-16">
      <div
        v-if="itemsCount === 0 && !tag.isFetchingItems && tag.hasFetchedItems"
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
          'mt-4',
        ]"
      >
        <BookstoreItem
          v-for="(item, index) in tag.items"
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
const { t: $t } = useI18n()
const bookstoreStore = useBookstoreStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()

useHead({
  title: $t('store_page_title'),
})

const tagId = ref('latest')

const tag = computed(() => bookstoreStore.getBookstoreCMSTagById(tagId.value))
const itemsCount = computed(() => tag.value.items.length)
const hasMoreItems = computed(() => !!tag.value.nextItemsKey)

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

async function fetchItems({ isRefresh = false } = {}) {
  try {
    await bookstoreStore.fetchCMSProductsByTagId(tagId.value, { isRefresh })
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
</script>
