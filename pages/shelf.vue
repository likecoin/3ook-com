<template>
  <div>
    <AppHeader />

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto px-4 laptop:px-12 pb-16">
      <UCard
        v-if="!hasLoggedIn"
        class="w-full max-w-sm mt-8"
        :ui="{ footer: 'flex justify-end' }"
      >
        <p v-text="$t('bookshelf_please_login')" />
        <template #footer>
          <LoginButton />
        </template>
      </UCard>
      <div
        v-else-if="itemsCount === 0 && !bookshelfStore.isFetching && bookshelfStore.hasFetched"
        class="flex flex-col items-center m-auto"
      >
        <UIcon
          class="opacity-20"
          name="i-material-symbols-menu-book-outline-rounded"
          size="128"
        />

        <span
          class="font-bold opacity-20"
          v-text="$t('bookshelf_no_items')"
        />

        <UButton
          class="mt-4"
          leading-icon="i-material-symbols-storefront-outline"
          :label="$t('bookshelf_no_items_cta_button')"
          :to="localeRoute({ name: 'store' })"
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
        <BookshelfItem
          v-for="(item, index) in bookshelfStore.items"
          :id="item.nftClassId"
          :key="item.nftClassId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.nftClassId"
          :nft-ids="item.nftIds"
          @open="handleBookshelfItemOpen"
          @download="handleBookshelfItemDownload"
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
const { loggedIn: hasLoggedIn } = useUserSession()
const localeRoute = useLocaleRoute()
const bookshelfStore = useBookshelfStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)

useHead({
  title: $t('shelf_page_title'),
})

const itemsCount = computed(() => bookshelfStore.items.length)
const hasMoreItems = computed(() => !!bookshelfStore.nextKey)

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

onMounted(async () => {
  if (hasLoggedIn.value) {
    await bookshelfStore.fetchItems()
  }
})

watch(
  () => hasLoggedIn.value,
  async (hasLoggedIn) => {
    if (hasLoggedIn) {
      await bookshelfStore.fetchItems({ isRefresh: true })
    }
  },
)

watch(
  () => shouldLoadMore.value,
  async (loadMore) => {
    if (loadMore) {
      do {
        // HACK: prevent scrollbar stuck at bottom, causing infinite loading
        window.scrollBy(0, -1)
        await bookshelfStore.fetchItems()
        await sleep(100)
      } while (bookshelfStore.nextKey && shouldLoadMore.value)
    }
  },
)

function handleBookshelfItemOpen({
  type,
  nftClassId,
}: {
  type: string
  name: string
  nftClassId?: string
  index?: number
}) {
  useLogEvent('shelf_open_book', {
    content_type: type,
    nft_class_id: nftClassId,
  })
}

function handleBookshelfItemDownload({
  nftClassId,
  type,
}: {
  nftClassId?: string
  type: string
}) {
  useLogEvent('shelf_download_book', {
    content_type: type,
    nft_class_id: nftClassId,
  })
}
</script>
