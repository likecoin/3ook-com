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
        :ll-medium="resolvedLLMedium"
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
  // False when the feed fell back to the popular list, so clicks report honestly.
  isPersonalized?: boolean
  // Fixed 3-column layout for narrow containers (e.g. modals).
  isCompact?: boolean
}>(), {
  title: '',
  llMedium: undefined,
  llSource: '',
  isLibrary: false,
  isPersonalized: false,
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

// Surfaces that name themselves (e.g. read-next) pass their own medium; the
// rest report provenance, which is the personalization flag they already carry.
const resolvedLLMedium = computed(() => props.llMedium ?? getRecommendationLLMedium(props.isPersonalized))

function handleBookOpen(classId: string) {
  useLogRecommendBookClick({
    nftClassId: classId,
    isPersonalized: props.isPersonalized,
    llMedium: resolvedLLMedium.value,
  })
}
</script>
