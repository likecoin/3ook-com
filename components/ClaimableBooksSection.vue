<template>
  <aside class="bg-primary/5">
    <UCollapsible
      v-if="claimableNFTClassIdsCount > 0"
      :default-open="true"
      :ui="{ content: 'border-b border-accented' }"
    >
      <header
        :class="[
          'group',
          'bg-primary hover:bg-primary/75',
          'cursor-pointer',
          'transition-colors',
        ]"
      >
        <div
          :class="[
            'flex',
            'justify-between',
            'items-center',
            'gap-4',
            'w-full',
            'max-w-[1440px]',
            'mx-auto',
            'py-4',
            'px-4 laptop:px-12',
            'text-theme-50',
          ]"
        >
          <div class="flex items-center gap-2">
            <h2
              class="text-xl font-bold"
              v-text="$t('bookshelf_claimable_books_title')"
            />

            <UChip
              :text="claimableNFTClassIdsCount"
              color="primary"
              size="3xl"
              :standalone="true"
              inset
              :ui="{ base: 'px-1.5 text-primary font-bold bg-theme-50 ring-0' }"
            />
          </div>

          <UIcon
            class="group-data-[state=open]:rotate-180 transition-transform duration-200"
            name="i-material-symbols-expand-circle-down-outline-rounded"
            size="24"
          />
        </div>
      </header>

      <template #content>
        <ul
          :class="[
            ...gridClasses,
            'w-full',
            'max-w-[1440px]',
            'mx-auto',
            'p-4',
            'laptop:px-12',
            'laptop:py-8',
          ]"
        >
          <BookshelfItem
            v-for="(nftClassId, index) in claimableNFTClassIds"
            :key="nftClassId"
            :class="getGridItemClassesByIndex(index)"
            :nft-class-id="nftClassId"
            :is-claimable="true"
            :lazy="index >= columnMax"
            @claim="handleBookClaim"
          />
        </ul>
      </template>
    </UCollapsible>
  </aside>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn } = useUserSession()
const {
  nftClassIds: claimableNFTClassIds,
  count: claimableNFTClassIdsCount,
  fetchClaimableFreeBooks,
  claimFreeBook,
} = useClaimableBooks()
const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount: claimableNFTClassIdsCount,
  hasMore: false,
})

async function handleBookClaim(nftClassId: string) {
  useLogEvent('claim_free_book', { nft_class_id: nftClassId })
  await claimFreeBook(nftClassId)
}

onMounted(async () => {
  await fetchClaimableFreeBooks()
})

watch(hasLoggedIn, async () => {
  await fetchClaimableFreeBooks()
})
</script>
