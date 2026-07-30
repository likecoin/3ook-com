<template>
  <section v-if="visibleNFTClassIds.length">
    <h2
      v-if="title"
      class="text-lg font-bold"
      v-text="title"
    />

    <ul
      :class="isCompact
        ? ['grid', 'grid-cols-3', 'gap-4', 'mt-2']
        : [...gridClasses, 'mt-6']"
    >
      <BookstoreItem
        v-for="(classId, index) in visibleNFTClassIds"
        :id="classId"
        :key="classId"
        :class="isCompact ? undefined : getGridItemClassesByIndex(index)"
        :nft-class-id="classId"
        :lazy="true"
        :ll-medium="llMedium"
        :ll-source="llSource"
        :is-library="isLibrary"
        @open="handleBookOpen"
      />
    </ul>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  nftClassIds: string[]
  title?: string
  llMedium?: string
  llSource?: string
  isLibrary?: boolean
  // Fixed 3-column layout for narrow containers (e.g. modals).
  isCompact?: boolean
}>(), {
  title: '',
  llMedium: undefined,
  llSource: '',
  isLibrary: false,
  isCompact: false,
})

const queryCache = useQueryCache()
const isAdultContentEnabled = useAdultContentSetting()

// The feed's candidate pools carry no `isHidden` flag, so live bookstore info is
// the only place hidden books can be dropped. Unresolved info keeps the book —
// a slow or failed metadata fetch must not blank the grid.
const visibleNFTClassIds = computed(() => props.nftClassIds.filter((nftClassId) => {
  const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
  if (bookstoreInfo?.isHidden) return false
  if (!isAdultContentEnabled.value && bookstoreInfo?.isAdultOnly) return false
  return true
}))

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount: computed(() => visibleNFTClassIds.value.length),
  hasMore: false,
})

function handleBookOpen(classId: string) {
  useLogEvent('recommend_book_click', {
    nft_class_id: classId,
    is_personalized: true,
    ll_medium: props.llMedium,
  })
}
</script>
