<template>
  <section v-if="visibleNFTClassIds.length">
    <h2
      v-if="title"
      class="text-lg font-bold"
      v-text="title"
    />

    <ul
      ref="bookGrid"
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
  // The ranked feed blended into `nftClassIds`, kept whole so one fetch's ids can
  // never pair with another's provenance. Undefined until it settles, so an
  // impression is never billed to a feed that has no identity yet.
  feed?: BookRecommendations
  title?: string
  // Caps visible rows per breakpoint; extras are hidden. 0 shows every row.
  maxRows?: number
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
  maxRows: 0,
  feed: undefined,
})

const queryCache = useQueryCache()
const isAdultContentEnabled = useAdultContentSetting()
const region = useRegionValue()

// The feed's candidate pools carry no `isHidden` flag, so live bookstore info is
// the only place hidden books can be dropped. Unresolved info keeps the book —
// a slow or failed metadata fetch must not blank the grid.
const visibleNFTClassIds = computed(() => props.nftClassIds.filter((nftClassId) => {
  const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
  // null is a resolved "no listing"; undefined is merely unresolved.
  if (bookstoreInfo === null) return false
  if (bookstoreInfo?.isHidden) return false
  if (!isAdultContentEnabled.value && bookstoreInfo?.isAdultOnly) return false
  if (getIsBookRegionRestricted(bookstoreInfo?.restrictedTerritories, region.value)) return false
  return true
}))

const { gridClasses, getGridItemClassesByIndex, getVisibleCount, hasRowTrimming } = usePaginatedGrid({
  itemsCount: computed(() => visibleNFTClassIds.value.length),
  hasMore: false,
  maxRows: computed(() => props.maxRows),
})

// Fallback-list ids still blend into the grid, but are not personalized picks.
const personalizedClassIds = computed(() =>
  props.feed?.isPersonalized ? props.feed.nftClassIds : [],
)

const personalizedClassIdSet = computed(() =>
  new Set(personalizedClassIds.value.map(normalizeNFTClassId)),
)

const isFeedPersonalized = computed(() => personalizedClassIds.value.length > 0)

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
    llSource: props.llSource,
    // Rank within what was actually rendered: hidden books are filtered out
    // before this list, so the visible index is the rank the reader saw.
    rank: index,
    feedId: props.feed?.feedId,
    isLibrary: props.isLibrary,
  })
}

// Anchored on the list, not the section: its heading clears the fold well before
// a cover does, and a heading nobody read is not an impression.
const { hasBeenVisible: hasSeenBookGrid, element: bookGridElement } = useVisibility('bookGrid')

// Measured off the resolved grid rather than mirroring the CSS breakpoints in
// JS, which is the duplication this exists to avoid.
function getRenderedBookCount() {
  const boundCount = visibleNFTClassIds.value.length
  // A compact grid applies no hiding classes, and without row trimming nothing
  // can be hidden — skip the forced style recalc for both.
  if (props.isCompact || !hasRowTrimming.value) return boundCount
  const gridElement = unrefElement(bookGridElement)
  if (!gridElement) return boundCount
  const columns = window.getComputedStyle(gridElement).gridTemplateColumns
  // An unrendered grid reports the specified value (`repeat(3, ...)`) rather
  // than used pixel tracks, which would miscount the columns.
  if (!columns || columns.includes('(')) return boundCount
  const columnCount = columns.split(' ').filter(Boolean).length
  if (!columnCount) return boundCount
  return getVisibleCount(columnCount)
}

// Keyed on the feed, never on the ids: callers bind a list that keeps churning
// as owned-book, author and bookstore-info lookups resolve, which would bill one
// feed as several impressions and inflate the denominator this exists to give.
const recommendationViewKey = computed(() => {
  // Rendering is not seeing: the product-page grid sits below the fold.
  if (!hasSeenBookGrid.value || !props.feed || !visibleNFTClassIds.value.length) return undefined
  // `''` is a real key: an editorial-only feed still earns one impression.
  return props.feed.feedId
})

// The key can revert to one already reported — `visibleNFTClassIds` flaps empty
// as lookups resolve — so `watch` alone would double-count.
const loggedRecommendationViewKeys = new Set<string>()

if (import.meta.client) {
  // `post`: the section unmounts whenever the id list flaps empty, so a pre-flush
  // callback would measure a detached grid and silently report the bound count.
  watch(recommendationViewKey, (key) => {
    if (key === undefined || loggedRecommendationViewKeys.has(key)) return
    loggedRecommendationViewKeys.add(key)
    const renderedBookCount = getRenderedBookCount()
    useLogRecommendBooksView({
      eventName: 'recommend_books_view',
      // No grid-level medium: a blended grid's items report their own, so naming
      // one here would mislabel the majority of the clicks it is joined to.
      llMedium: props.llMedium,
      llSource: props.llSource,
      isPersonalized: isFeedPersonalized.value,
      personalizedCount: personalizedClassIds.value.length,
      isLibrary: props.isLibrary,
      bookCount: visibleNFTClassIds.value.length,
      visibleCount: renderedBookCount,
      feedId: key,
      // Hidden books sit at the end, so the visible slice is the ranked prefix.
      nftClassIds: visibleNFTClassIds.value.slice(0, renderedBookCount),
    })
  }, { flush: 'post' })
}
</script>
