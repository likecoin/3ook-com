<template>
  <div>
    <AppHeader />

    <main class="flex flex-col items-center w-full max-w-[1440px] mx-auto px-4 laptop:px-12">
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
        <BookshelfItem
          v-for="item in bookshelfStore.items"
          :id="item.id"
          :key="item.id"
          :nft-class-id="item.nftClassId"
          @open="handleBookshelfItemOpen"
        />

        <li
          v-if="bookshelfStore.isFetching || !bookshelfStore.hasFetched"
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
          v-else-if="bookshelfStore.nextKey"
          fallback-tag="li"
        >
          <li
            ref="infiniteScrollDetector"
            :key="bookshelfStore.nextKey"
          />
        </ClientOnly>
      </ul>
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

onMounted(async () => {
  if (hasLoggedIn.value) {
    await bookshelfStore.fetchItems()
  }
})

watch(
  () => hasLoggedIn.value,
  async (hasLoggedIn) => {
    if (hasLoggedIn) {
      await bookshelfStore.fetchItems()
    }
  },
)

watch(
  () => shouldLoadMore.value,
  (shouldLoadMore) => {
    if (shouldLoadMore) {
      bookshelfStore.fetchItems({ isMore: true })
    }
  },
)

function handleBookshelfItemOpen({
  type,
  url,
  name,
  nftClassId,
}: {
  type: string
  url: string
  name: string
  nftClassId?: string
}) {
  navigateTo(localeRoute({
    name: `reader-${type}`,
    query: { nft_class_id: nftClassId, file_url: url, filename: name },
  }))
}
</script>
