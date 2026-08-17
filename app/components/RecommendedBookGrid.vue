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
        :ll-medium="getItemLLMedium(classId)"
        :ll-source="llSource"
        :is-library="isLibrary"
        @open="handleBookOpen($event, index)"
      />
    </ul>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  nftClassIds: string[]
  // Personalized picks among `nftClassIds`
  personalizedNFTClassIds?: string[]
  title?: string
  // Caps visible rows per breakpoint; extras are hidden. 0 shows every row.
  maxRows?: number
  llMedium?: string
  llSource?: string
  isLibrary?: boolean
  // Identifies the ranked list these ids came from; pairs an impression with
  // the clicks it produced.
  feedId?: string
  // Fixed 3-column layout for narrow containers (e.g. modals).
  isCompact?: boolean
}>(), {
  title: '',
  llMedium: undefined,
  llSource: '',
  isLibrary: false,
  personalizedNFTClassIds: () => [],
  isCompact: false,
  maxRows: 0,
  feedId: undefined,
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
  maxRows: computed(() => props.maxRows),
})

const personalizedClassIdSet = computed(() =>
  new Set(props.personalizedNFTClassIds.map(normalizeNFTClassId)),
)

const isFeedPersonalized = computed(() => props.personalizedNFTClassIds.length > 0)

function getIsItemPersonalized(classId: string) {
  return personalizedClassIdSet.value.has(normalizeNFTClassId(classId))
}

// An explicit `llMedium` wins; otherwise report the item's provenance.
function getItemLLMedium(classId: string) {
  return props.llMedium ?? getRecommendationLLMedium(getIsItemPersonalized(classId))
}

function handleBookOpen(classId: string, index: number) {
  useLogRecommendBookClick({
    nftClassId: classId,
    isPersonalized: getIsItemPersonalized(classId),
    llMedium: getItemLLMedium(classId),
    // Rank within what was actually rendered: hidden books are filtered out
    // before this list, so the visible index is the rank the reader saw.
    rank: index,
    feedId: props.feedId,
    isLibrary: props.isLibrary,
  })
}

// Keyed on the feed, never on the ids: callers bind a list that keeps churning
// as owned-book, author and bookstore-info lookups resolve, which would bill one
// feed as several impressions and inflate the denominator this exists to give.
const recommendationViewKey = computed(() => {
  if (!visibleNFTClassIds.value.length) return undefined
  return `${props.llSource}:${props.llMedium}:${props.feedId}`
})

watch(recommendationViewKey, (key) => {
  if (!key || import.meta.server) return
  useLogRecommendBooksView({
    eventName: 'recommend_books_view',
    // No grid-level medium: a blended grid's items report their own, so naming
    // one here would mislabel the majority of the clicks it is joined to.
    llMedium: props.llMedium,
    llSource: props.llSource,
    isPersonalized: isFeedPersonalized.value,
    personalizedCount: props.personalizedNFTClassIds.length,
    isLibrary: props.isLibrary,
    bookCount: visibleNFTClassIds.value.length,
    feedId: props.feedId,
    nftClassIds: visibleNFTClassIds.value,
  })
}, { immediate: true })
</script>
