<template>
  <div>
    <header
      v-if="!isMyBookshelf"
      class="flex gap-2 w-full max-w-[1440px] mx-auto px-4 laptop:px-12 py-4"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <UAvatar
          :src="shelfOwner?.avatarSrc"
          :alt="shelfOwnerDisplayName"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />

        <div class="overflow-hidden">
          <p
            v-if="shelfOwnerDisplayName"
            class="font-medium text-highlighted text-sm"
            v-text="shelfOwnerDisplayName"
          />
          <p
            v-if="shelfOwnerWalletAddress"
            :class="[
              shelfOwnerDisplayName ? 'text-muted' : 'text-highlighted',
              'text-xs',
              'text-ellipsis',
              'font-mono',
              'overflow-hidden',
              'whitespace-nowrap',
            ]"
            v-text="shelfOwnerWalletAddress"
          />
        </div>
      </div>
    </header>

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto px-4 laptop:px-12 pb-16">
      <UCard
        v-if="!walletAddress && !hasLoggedIn"
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
          :lazy="index >= columnMax"
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
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const getRouteParam = useRouteParam()
const bookshelfStore = useBookshelfStore()
const metadataStore = useMetadataStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)

const itemsCount = computed(() => bookshelfStore.items.length)
const hasMoreItems = computed(() => !!bookshelfStore.nextKey)

const walletAddress = computed(() => {
  return (getRouteParam('walletAddress') || user.value?.evmWallet)?.toLowerCase()
})

const isMyBookshelf = computed(() => {
  return walletAddress.value === user.value?.evmWallet?.toLowerCase()
})

await callOnce(async () => {
  if (!isMyBookshelf.value && walletAddress.value) {
    try {
      await metadataStore.lazyFetchLikerInfoByWalletAddress(walletAddress.value)
    }
    catch {
      // Ignore error
    }
  }
}, { mode: 'navigation' })

const shelfOwner = computed(() => {
  return metadataStore.getLikerInfoByWalletAddress(walletAddress.value)
})
const shelfOwnerDisplayName = computed(() => {
  return shelfOwner.value?.displayName || shelfOwner.value?.evmWallet
})
const shelfOwnerWalletAddress = computed(() => {
  return shelfOwner.value?.evmWallet || walletAddress.value
})

useHead(() => ({
  title: isMyBookshelf.value
    ? $t('shelf_page_title')
    : $t('shelf_page_title_someone_else', { name: shelfOwnerDisplayName.value || shelfOwnerWalletAddress.value }),
  meta: [
    {
      name: 'robots',
      content: 'noindex',
    },
  ],
}))

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

onMounted(async () => {
  if (walletAddress.value) {
    await bookshelfStore.fetchItems({ walletAddress: walletAddress.value })
  }
})

watch(
  walletAddress,
  async (value) => {
    bookshelfStore.reset()
    if (value) {
      await bookshelfStore.fetchItems({ walletAddress: value, isRefresh: true })
    }
  },
)

watch(
  shouldLoadMore,
  async (loadMore) => {
    if (walletAddress.value && loadMore) {
      do {
        // HACK: prevent scrollbar stuck at bottom, causing infinite loading
        window.scrollBy(0, -1)
        await bookshelfStore.fetchItems({ walletAddress: walletAddress.value })
        await sleep(100)
      } while (walletAddress.value && bookshelfStore.nextKey && shouldLoadMore.value)
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
