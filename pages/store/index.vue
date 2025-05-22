<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto px-4 laptop:px-12">
      <div
        v-if="tag.items.length === 0 && !tag.isFetchingItems && tag.hasFetchedItems"
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
          'grid',

          'grid-cols-3',
          'tablet:grid-cols-4',
          'laptop:grid-cols-5',
          'desktop:grid-cols-6',
          'widescreen:grid-cols-7',

          'gap-x-3 tablet:gap-x-6',
          'gap-y-6 tablet:gap-y-11',

          'pt-4',
          'pb-16',
        ]"
      >
        <BookstoreItem
          v-for="item in tag.items"
          :id="item.classId"
          :key="item.classId"
          :nft-class-id="item.classId"
          :book-name="item.title"
          :book-cover-src="item.imageUrl"
          :price="item.minPrice"
        />

        <li
          v-if="tag.isFetchingItems || !tag.hasFetchedItems"
          :class="[
            'flex',
            'justify-center',

            'col-span-3',
            'tablet:col-span-4',
            'laptop:col-span-5',
            'desktop:col-span-6',
            'widescreen:col-span-7',

            'pt-16',
            'py-48',
          ]"
        >
          <UIcon
            class="animate-spin"
            name="material-symbols-progress-activity"
            size="48"
          />
        </li>
        <ClientOnly
          v-else-if="tag.nextItemsKey"
          fallback-tag="li"
        >
          <li
            ref="infiniteScrollDetector"
            :key="tag.nextItemsKey"
          />
        </ClientOnly>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const bookstoreStore = useBookstoreStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()

const tagId = ref('latest')

const tag = computed(() => bookstoreStore.getBookstoreCMSTagById(tagId.value))

async function fetchItems({ isRefresh = false } = {}) {
  try {
    await bookstoreStore.fetchCMSProductsByTagId(tagId.value, { isRefresh })
  }
  catch (error) {
    handleError(error, {
      title: isRefresh ? $t('store_fetch_items_error') : $t('store_fetch_more_items_error'),
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
</script>
