<template>
  <UModal
    :title="$t('reader_book_end_title')"
    :close="false"
    fullscreen
    :ui="{
      header: 'justify-center px-0 sm:px-0 pt-[max(--spacing(2),env(safe-area-inset-top))] pb-2',
      body: 'p-0 sm:p-0',
      footer: 'justify-center px-0 sm:px-0 pb-[max(--spacing(4),env(safe-area-inset-bottom))]',
    }"
  >
    <!-- Replacing the header drops UModal's own title, so DialogTitle is rendered here. -->
    <template #header>
      <div class="relative flex items-center justify-center w-full max-w-lg px-2 min-h-11">
        <UButton
          class="absolute left-2 size-11 justify-center"
          icon="i-material-symbols-close-rounded"
          color="neutral"
          variant="ghost"
          size="lg"
          :aria-label="$t('common_close')"
          @click="emit('close', 'dismiss')"
        />
        <DialogTitle as-child>
          <h2
            class="text-highlighted font-semibold"
            v-text="$t('reader_book_end_title')"
          />
        </DialogTitle>
      </div>
    </template>

    <template #body>
      <div class="flex flex-col gap-7 w-full max-w-lg mx-auto px-4 pt-2 pb-6">
        <div class="flex flex-col items-center text-center">
          <BookCover
            class="w-24"
            :src="bookCoverSrc"
            :alt="bookInfo.name.value"
            :has-shadow="true"
          />
          <p
            class="mt-4 text-2xl font-bold text-highlighted"
            v-text="$t('reader_book_end_congrats')"
          />
          <p
            class="mt-2 text-sm text-muted"
            v-text="$t('reader_book_end_book_name', { name: bookInfo.name.value })"
          />
          <p
            v-if="!isBorrowed"
            class="mt-1 text-sm text-muted"
            v-text="$t('reader_book_end_owned_description')"
          />
        </div>

        <div
          v-if="isBorrowed"
          class="flex items-center gap-3 p-4 rounded-xl bg-elevated"
        >
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium text-highlighted"
              v-text="$t('reader_book_end_borrowed_title')"
            />
            <p
              class="mt-0.5 text-xs text-muted"
              v-text="$t('reader_book_end_borrowed_description')"
            />
          </div>
          <UButton
            :label="$t('reader_book_end_collect_button')"
            class="shrink-0 min-h-11"
            color="neutral"
            variant="outline"
            size="lg"
            @click="emit('close', 'collect')"
          />
        </div>

        <template
          v-for="section in sections"
          :key="section.llSource"
        >
          <section v-if="isLoading">
            <h2
              class="text-lg font-bold"
              v-text="section.title"
            />
            <ul
              class="grid grid-cols-3 gap-4 mt-2"
              aria-hidden="true"
            >
              <li
                v-for="index in 3"
                :key="index"
              >
                <USkeleton class="bg-skeleton aspect-2/3 w-full rounded" />
                <USkeleton class="bg-skeleton mt-2 h-[2lh] w-full rounded" />
              </li>
            </ul>
          </section>
          <RecommendedBookGrid
            v-else
            :nft-class-ids="section.feed.nftClassIds"
            :feed="section.feed"
            :title="section.title"
            :is-library="isBorrowed"
            ll-medium="book-end"
            :ll-source="section.llSource"
            is-compact
          />
        </template>
      </div>
    </template>

    <template #footer>
      <div class="grid grid-cols-2 gap-2 w-full max-w-lg px-4">
        <UButton
          :label="$t('reader_book_end_back_button')"
          color="neutral"
          variant="ghost"
          class="min-h-12"
          size="xl"
          block
          @click="emit('close', 'dismiss')"
        />
        <UButton
          :label="$t('reader_book_end_explore_button')"
          class="min-h-12"
          size="xl"
          block
          @click="emit('close', 'explore')"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { DialogTitle } from 'reka-ui'
import type { BookEndModalProps, BookEndModalResult } from './BookEndModal.props'

const BOOKS_PER_SECTION = 3
const PUBLISHER_BOOKS_FETCH_LIMIT = 12
const RECOMMENDATIONS_FETCH_LIMIT = 9

const props = defineProps<BookEndModalProps>()

const emit = defineEmits<{ close: [result?: BookEndModalResult] }>()

const { t: $t } = useI18n()
const queryCache = useQueryCache()
const bookInfo = useBookInfo({ nftClassId: toRef(props, 'nftClassId') })
const { fetchBookRecommendations } = useBookRecommendations()
const { getIsBookVisible } = useBookVisibility()
const { isApp } = useAppDetection()

const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const isLoading = ref(true)
const publisherBooks = ref<BookRecommendations>(getEmptyBookRecommendations())
const recommendedBooks = ref<BookRecommendations>(getEmptyBookRecommendations())

const sections = computed(() => [
  {
    title: bookInfo.publisherName.value
      ? $t('reader_book_end_publisher_books_title', { name: bookInfo.publisherName.value })
      : $t('reader_book_end_publisher_books_fallback_title'),
    feed: publisherBooks.value,
    llSource: 'reader-book-end-publisher',
  },
  {
    title: $t('reader_book_end_for_you_title'),
    feed: recommendedBooks.value,
    llSource: 'reader-book-end-for-you',
  },
])

async function fetchPublisherNFTClassIds() {
  const ownerWallet = bookInfo.nftClassOwnerWalletAddress.value
  if (!ownerWallet) return []
  try {
    const result = await fetchNFTClassesByOwnerWalletAddress(ownerWallet, { limit: PUBLISHER_BOOKS_FETCH_LIMIT })
    return sortNFTClassesByDatePublished(result.data).map(nftClass => normalizeNFTClassId(nftClass.address))
  }
  catch (error) {
    console.warn('Failed to fetch publisher books:', error)
    return []
  }
}

onMounted(async () => {
  try {
    const currentNFTClassId = normalizeNFTClassId(props.nftClassId)
    const [publisherNFTClassIds, recommendations] = await Promise.all([
      fetchPublisherNFTClassIds(),
      fetchBookRecommendations({
        seed: props.nftClassId,
        limit: RECOMMENDATIONS_FETCH_LIMIT,
        isLibrary: props.isBorrowed,
      }),
    ])
    const otherPublisherNFTClassIds = publisherNFTClassIds.filter(id => id !== currentNFTClassId)

    // Resolved up front so both rows can be trimmed to what will actually show,
    // rather than reshuffling once the grids drop hidden books.
    await prefetchBookstoreInfo(queryCache, [...otherPublisherNFTClassIds, ...recommendations.nftClassIds])

    const getIsLibraryBook = (id: string) => !!getBookstoreInfoByNFTClassIdFromCache(queryCache, id)?.isPlusReadingEnabled
    // The app hides the store, so only library titles can be opened there.
    const getIsBookListed = (id: string) => getIsBookVisible(id) && (!isApp.value || getIsLibraryBook(id))

    const listedPublisherNFTClassIds = otherPublisherNFTClassIds.filter(getIsBookListed)
    if (props.isBorrowed) {
      // Stable sort: books the reader can also borrow come first, newest first within each group.
      listedPublisherNFTClassIds.sort((a, b) => Number(getIsLibraryBook(b)) - Number(getIsLibraryBook(a)))
    }
    const shownPublisherNFTClassIds = listedPublisherNFTClassIds.slice(0, BOOKS_PER_SECTION)

    const shownNFTClassIdSet = new Set([currentNFTClassId, ...shownPublisherNFTClassIds])
    const shownRecommendedNFTClassIds = recommendations.nftClassIds
      .filter(id => !shownNFTClassIdSet.has(normalizeNFTClassId(id)) && getIsBookListed(id))
      .slice(0, BOOKS_PER_SECTION)

    publisherBooks.value = { ...getEmptyBookRecommendations(), nftClassIds: shownPublisherNFTClassIds }
    recommendedBooks.value = { ...recommendations, nftClassIds: shownRecommendedNFTClassIds }
  }
  finally {
    isLoading.value = false
  }
})
</script>
