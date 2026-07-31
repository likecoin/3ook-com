<template>
  <div>
    <header
      v-if="!isMyBookshelf"
      class="flex gap-6 w-full max-w-[1440px] mx-auto px-4 laptop:px-12 py-4"
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
      <UAlert
        v-if="shelfNotice"
        class="w-full mt-4"
        :title="shelfNotice.title"
        :description="shelfNotice.description"
        :icon="shelfNotice.icon"
        :color="shelfNotice.color"
        variant="subtle"
        :actions="shelfNotice.actions"
      />
      <UCard
        v-if="isGuestShelf"
        class="w-full max-w-(--breakpoint-phone) mt-4"
        :ui="{
          header: 'flex justify-center items-center p-4 sm:p-4 bg-theme-black',
          body: 'flex flex-col items-center text-center',
          footer: 'grid tablet:grid-cols-2 gap-2',
        }"
      >
        <template #header>
          <AppLogo
            :is-icon="false"
            :height="64"
          />
        </template>

        <UIcon
          class="opacity-20"
          name="i-material-symbols-menu-book-outline-rounded"
          size="80"
        />
        <h2
          class="text-lg font-bold text-highlighted"
          v-text="$t('bookshelf_please_login_value')"
        />
        <p
          class="text-sm text-muted mt-1 mb-4"
          v-text="$t('bookshelf_please_login')"
        />

        <template #footer>
          <UButton
            class="max-tablet:order-last"
            :label="$t('bookshelf_please_login_learn_more')"
            :to="localeRoute({ name: 'about', query: { ll_medium: 'about-link', ll_source: 'shelf' } })"
            variant="link"
            color="neutral"
            size="lg"
            block
          />
          <LoginButton block />
        </template>
      </UCard>
      <template v-else>
        <!-- Search + tab selector -->
        <header
          v-if="isMyBookshelf"
          class="flex flex-col w-full mt-4"
        >
          <UCollapsible
            :open="isSearchOpen"
          >
            <template #content>
              <UInput
                v-model="searchInputValue"
                class="w-full mb-2"
                icon="i-material-symbols-search-rounded"
                size="lg"
                type="search"
                :autofocus="true"
                :placeholder="$t('bookshelf_search_input_placeholder')"
                :ui="{
                  base: [
                    '[&::-webkit-search-cancel-button]:appearance-none',
                    'rounded-full',
                  ],
                }"
                @keydown.esc="handleToggleSearch"
              >
                <template
                  v-if="searchInputValue.length"
                  #trailing
                >
                  <UButton
                    color="neutral"
                    variant="link"
                    icon="i-material-symbols-close-rounded"
                    :aria-label="$t('bookshelf_search_clear_label')"
                    @click="handleClearSearch"
                  />
                </template>
              </UInput>
            </template>
          </UCollapsible>

          <div class="flex items-center gap-2">
            <PillButtonGroup
              v-model="activeTab"
              :items="shelfTabs"
              :is-loading="isTabsLoading"
              class="grow min-w-0"
            />
            <PillButton
              :icon="isSearchOpen ? 'i-material-symbols-close-rounded' : 'i-material-symbols-search-rounded'"
              :aria-label="isSearchOpen ? $t('bookshelf_search_close_label') : $t('bookshelf_search_label')"
              :is-active="isSearchOpen"
              @click="handleToggleSearch"
            />
            <UploadBookModal
              v-if="canUploadBook"
              @uploaded="loadBookshelfData(walletAddress!, { isRefresh: true })"
            >
              <PillButton
                class="max-laptop:hidden"
                :label="$t('uploaded_book_upload_button')"
                icon="i-material-symbols-upload-rounded"
              />
            </UploadBookModal>
          </div>
        </header>

        <!-- Empty state -->
        <div
          v-if="isCurrentTabEmpty && !isCurrentTabFetching"
          class="flex flex-col items-center m-auto py-12"
        >
          <UIcon
            class="opacity-20"
            name="i-material-symbols-menu-book-outline-rounded"
            size="128"
          />
          <span
            class="font-bold opacity-20"
            v-text="currentTabEmptyMessage"
          />

          <UButton
            v-if="activeTab !== 'uploads'"
            class="mt-4"
            leading-icon="i-material-symbols-storefront-outline"
            :label="$t('bookshelf_no_items_cta_button')"
            :to="localeRoute({ name: 'store' })"
          />
        </div>
        <template v-else>
          <!-- Reading tab -->
          <ul
            v-if="activeTab === 'reading'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <BookshelfItem
              v-for="(item, index) in visibleReadingItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="isMyBookshelf && item.isOwned"
              :is-plus-reading="item.isPlusReading"
              :is-plus-reading-accessible="item.isPlusReadingAccessible"
              :can-archive="isMyBookshelf"
              :can-edit-reading-state="isMyBookshelf"
              :is-finished="item.completedAt != null"
              :is-did-not-finish="item.didNotFinishAt != null"
              :progress="item.progress"
              :is-my-bookshelf="isMyBookshelf"
              :total-reading-time-ms="item.totalReadingTimeMs"
              :total-tts-listening-time-ms="item.totalTTSListeningTimeMs"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-finished="handleMarkBookAsFinished"
              @mark-as-did-not-finish="handleMarkBookAsDidNotFinish"
              @return-plus-reading="handleReturnPlusReadingBook"
              @archive="handleArchiveBook"
            />
          </ul>

          <!-- Finished tab -->
          <ul
            v-else-if="activeTab === 'finished'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <BookshelfItem
              v-for="(item, index) in visibleFinishedItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="isMyBookshelf"
              :can-archive="isMyBookshelf"
              :can-edit-reading-state="isMyBookshelf"
              :is-finished="true"
              :progress="item.progress"
              :is-my-bookshelf="isMyBookshelf"
              :total-reading-time-ms="item.totalReadingTimeMs"
              :total-tts-listening-time-ms="item.totalTTSListeningTimeMs"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-did-not-finish="handleMarkBookAsDidNotFinish"
              @archive="handleArchiveBook"
            />
          </ul>

          <!-- DNF tab -->
          <ul
            v-else-if="activeTab === 'dnf'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <BookshelfItem
              v-for="(item, index) in visibleDnfItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="isMyBookshelf"
              :can-archive="isMyBookshelf"
              :can-edit-reading-state="isMyBookshelf"
              :is-did-not-finish="true"
              :progress="item.progress"
              :is-my-bookshelf="isMyBookshelf"
              :total-reading-time-ms="item.totalReadingTimeMs"
              :total-tts-listening-time-ms="item.totalTTSListeningTimeMs"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-finished="handleMarkBookAsFinished"
              @archive="handleArchiveBook"
            />
          </ul>

          <!-- Uploads tab -->
          <ul
            v-else-if="activeTab === 'uploads'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <UploadedBookshelfItem
              v-for="(item, index) in visibleUploadedBookItems"
              :key="item.id"
              :class="getGridItemClassesByIndex(index)"
              :book-id="item.id"
              :content-type="item.contentType"
              :progress="item.progress"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              :is-accessible="isUploadedBookAccessible"
              @delete="handleDeleteUploadedBook"
            />
          </ul>

          <!-- Staking tab -->
          <ul
            v-else-if="activeTab === 'staking'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <BookshelfItem
              v-for="(item, index) in visibleStakingItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="item.isOwned"
              :is-archived="item.archivedAt != null"
              :can-archive="isMyBookshelf"
              :progress="item.progress"
              :is-my-bookshelf="isMyBookshelf"
              :total-reading-time-ms="item.totalReadingTimeMs"
              :total-tts-listening-time-ms="item.totalTTSListeningTimeMs"
              :staked-like="item.stakedAmount"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @archive="handleArchiveBook"
              @unarchive="handleUnarchiveBook"
            />
          </ul>

          <!-- Archived tab -->
          <ul
            v-else-if="activeTab === 'archived'"
            :class="[
              ...gridClasses,
              'w-full',
              'mt-4',
            ]"
          >
            <BookshelfItem
              v-for="(item, index) in visibleArchivedItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="isMyBookshelf"
              :is-archived="true"
              :can-archive="isMyBookshelf"
              :can-edit-reading-state="isMyBookshelf"
              :is-finished="item.completedAt != null"
              :is-did-not-finish="item.didNotFinishAt != null"
              :progress="item.progress"
              :is-my-bookshelf="isMyBookshelf"
              :total-reading-time-ms="item.totalReadingTimeMs"
              :total-tts-listening-time-ms="item.totalTTSListeningTimeMs"
              :lazy="index >= columnMax"
              :offline-cache-keys="offlineCacheKeys"
              :is-offline="!isOnline"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-finished="handleMarkBookAsFinished"
              @mark-as-did-not-finish="handleMarkBookAsDidNotFinish"
              @unarchive="handleUnarchiveBook"
            />
          </ul>

          <!-- No search results -->
          <div
            v-if="isSearchResultEmpty"
            class="flex flex-col items-center m-auto py-12"
          >
            <UIcon
              class="opacity-20"
              name="i-material-symbols-search-off-rounded"
              size="128"
            />
            <span
              class="font-bold opacity-20 text-center"
              v-text="$t('bookshelf_no_search_results', { term: searchInputValue.trim() })"
            />

            <UButton
              class="mt-4"
              variant="subtle"
              color="neutral"
              :label="$t('bookshelf_search_clear_label')"
              @click="handleClearSearch"
            />
          </div>

          <div
            v-if="isCurrentTabFetching"
            class="flex justify-center py-48"
          >
            <UIcon
              class="animate-spin"
              name="material-symbols-progress-activity"
              size="48"
            />
          </div>
        </template>
      </template>
    </main>

    <AppFooter v-if="isGuestShelf && !isApp" />

    <!-- Read-next suggestions after marking a book finished -->
    <UModal
      v-model:open="isReadNextModalOpen"
      :title="$t('bookshelf_read_next_modal_title')"
      :description="$t('bookshelf_read_next_modal_description')"
    >
      <template #body>
        <RecommendedBookGrid
          :nft-class-ids="readNextBooks.nftClassIds"
          :is-personalized="readNextBooks.isPersonalized"
          is-compact
          ll-medium="recommendation-read-next"
          ll-source="bookshelf-finished"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { DeleteUploadedBookModal } from '#components'
import { getBookEntityName, getHasFreeEdition } from '~~/shared/utils/bookstore'

import type { BookshelfItem } from '~/stores/bookshelf'
import type { StakingItem } from '~/stores/staking'

type ShelfTab = 'reading' | 'finished' | 'dnf' | 'uploads' | 'staking' | 'archived'

interface BookshelfItemWithStaking extends BookshelfItem {
  stakedAmount: number
  pendingRewards: number
  isOwned: boolean
  isPlusReading?: boolean
  isPlusReadingAccessible?: boolean
}

const { likeCoinTokenDecimals } = useRuntimeConfig().public
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const route = useRoute()
const router = useRouter()
const getRouteQuery = useRouteQuery()
const getRouteParam = useRouteParam()
const bookshelfStore = useBookshelfStore()
const queryCache = useQueryCache()
const uploadedBooksStore = useUploadedBooksStore()
const stakingStore = useStakingStore()
const toast = useToast()
const { isLikerPlus, isExpiredLikerPlus } = useSubscription()
const { isApp } = useAppDetection()
const isUploadedBookFeatureEnabled = useFeatureFlagEnabled('plus-upload-files')
const overlay = useOverlay()
const deleteModal = overlay.create(DeleteUploadedBookModal)

const isUploadedBookAccessible = computed(() => isLikerPlus.value && !isExpiredLikerPlus.value)
// Active Plus reads any borrowed book; free-edition borrows stay readable without
// it. A lapsed member's paid borrows render locked (resubscribe CTA), free ones don't.
const isActivePlusReadingAccessible = computed(() => isLikerPlus.value && !isExpiredLikerPlus.value)
function getIsPlusReadingItemAccessible(nftClassId: string) {
  if (isActivePlusReadingAccessible.value) return true
  const info = getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
  return !!info?.isPlusReadingEnabled && getHasFreeEdition(info?.prices)
}
const canUploadBook = computed(() => isMyBookshelf.value && isUploadedBookFeatureEnabled.value && isUploadedBookAccessible.value && !isApp.value)
const isUploadedBookVisible = computed(() => isMyBookshelf.value && isUploadedBookFeatureEnabled.value && hasUploadedBooks.value)

const queryTab = computed(() => getRouteQuery('tab'))
const defaultTab = computed<ShelfTab>(() => shelfTabs.value[0]?.value || 'reading')

const stakingData = computed(() => {
  return isMyBookshelf.value
    ? stakingStore.getUserStakingData(user.value!.evmWallet)
    : {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
})

// All owned bookshelf items (for other user's shelf or as base data)
const bookshelfItemsAll = computed<BookshelfItemWithStaking[]>(() => {
  const stakedItemsByNFTClassId = new Map(
    stakingData.value.items.map(item => [
      item.nftClassId.toLowerCase(),
      item,
    ]),
  )

  return bookshelfStore.items.map((bookshelfItem) => {
    const normalizedNFTClassId = bookshelfItem.nftClassId.toLowerCase()
    const stakedItem = stakedItemsByNFTClassId.get(normalizedNFTClassId)

    return {
      ...bookshelfItem,
      stakedAmount: stakedItem ? Number(formatUnits(stakedItem.stakedAmount, likeCoinTokenDecimals)) : 0,
      pendingRewards: stakedItem ? Number(formatUnits(stakedItem.pendingRewards, likeCoinTokenDecimals)) : 0,
      isOwned: true,
    }
  })
})

// Borrowed (non-owned) Plus-reading books plus pre-lent free books, rendered
// identically. Only on my own shelf; deduped vs owned books by the store. They
// have no terminal state — they live in the Reading tab until returned (還書).
const plusReadingItemsAll = computed<BookshelfItemWithStaking[]>(() => {
  if (!isMyBookshelf.value) return []
  return [...bookshelfStore.plusReadingItems, ...bookshelfStore.preLentItems].map(item => ({
    ...item,
    stakedAmount: 0,
    pendingRewards: 0,
    isOwned: false,
    isPlusReading: true,
    // Raw free list on purpose (covers borrowed free books too):
    // free books never lock behind a resubscribe CTA; the reader gate is the backstop.
    isPlusReadingAccessible: bookshelfStore.preLentNFTClassIds.includes(item.nftClassId)
      || getIsPlusReadingItemAccessible(item.nftClassId),
  }))
})

// Finished tab: books with completedAt set (not archived), sorted by completedAt desc
const finishedItems = computed(() => {
  return bookshelfItemsAll.value
    .filter(item => item.completedAt != null && item.archivedAt == null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
})

// DNF tab: books with didNotFinishAt set (not archived), sorted by didNotFinishAt desc
const dnfItems = computed(() => {
  return bookshelfItemsAll.value
    .filter(item => item.didNotFinishAt != null && item.archivedAt == null)
    .sort((a, b) => (b.didNotFinishAt ?? 0) - (a.didNotFinishAt ?? 0))
})

// Archived tab: books with archivedAt set, sorted by archivedAt desc
const archivedItems = computed(() => {
  if (!isMyBookshelf.value) return []
  return bookshelfItemsAll.value
    .filter(item => item.archivedAt != null)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
})

function resolveTabId(tabId: string): ShelfTab {
  if (tabId === 'uploads') {
    if (isUploadedBookVisible.value || canUploadBook.value) return 'uploads'
    return defaultTab.value
  }
  if (tabId === 'finished') {
    if (finishedItems.value.length > 0) return 'finished'
    return defaultTab.value
  }
  if (tabId === 'dnf') {
    if (dnfItems.value.length > 0) return 'dnf'
    return defaultTab.value
  }
  if (tabId === 'archived') {
    if (archivedItems.value.length > 0) return 'archived'
    return defaultTab.value
  }
  if (tabId && shelfTabs.value.some(t => t.value === tabId)) return tabId as ShelfTab
  return defaultTab.value
}

const activeTab = computed<ShelfTab>({
  get: () => {
    if (!isMyBookshelf.value) return defaultTab.value
    return resolveTabId(queryTab.value)
  },
  set: (tab: ShelfTab) => {
    router.replace({
      query: {
        ...route.query,
        tab: resolveTabId(tab),
      },
    })
  },
})

// Reading tab: owned books (excluding archived, finished, DNF) plus all borrowed
// Plus-reading books, most-recently-opened first. Sort on lastOpenedTime (not
// progress): the reader stamps it on open, so a just-opened book at 0% still
// rises to the top instead of sinking into the never-opened tail.
const readingItems = computed(() => {
  const ownedReading = bookshelfItemsAll.value
    .filter(item => !isMyBookshelf.value || (item.archivedAt == null && item.completedAt == null && item.didNotFinishAt == null))
  return [...ownedReading, ...plusReadingItemsAll.value]
    .sort((a, b) => {
      if (b.lastOpenedTime !== a.lastOpenedTime) return b.lastOpenedTime - a.lastOpenedTime
      // Within an equal-timestamp group (mostly legacy books lacking a
      // lastOpenedTime stamp), surface started books over untouched ones, then
      // fall back to nftClassId so the tail stays deterministic across loads.
      const aStarted = a.progress > 0
      const bStarted = b.progress > 0
      if (aStarted !== bStarted) return aStarted ? -1 : 1
      // Never-opened books all tie at lastOpenedTime 0, so a just-bought book
      // used to land wherever its id happened to sort. Newest purchase first.
      if (b.acquiredAt !== a.acquiredAt) return b.acquiredAt - a.acquiredAt
      // nftClassId is a lowercase 0x-hex string, so plain ordering matches
      // collation without the locale-aware cost of localeCompare.
      return a.nftClassId < b.nftClassId ? -1 : a.nftClassId > b.nftClassId ? 1 : 0
    })
})

// Staking tab: books user has staked on, sorted by staked amount desc
const stakingItems = computed<BookshelfItemWithStaking[]>(() => {
  const ownedItemsByNFTClassId = new Map(
    bookshelfStore.items.map(item => [
      item.nftClassId.toLowerCase(),
      item,
    ]),
  )

  const items: BookshelfItemWithStaking[] = []

  stakingData.value.items.forEach((stakedItem: StakingItem) => {
    const normalizedNFTClassId = stakedItem.nftClassId.toLowerCase()
    const ownedItem = ownedItemsByNFTClassId.get(normalizedNFTClassId)

    items.push({
      nftClassId: stakedItem.nftClassId,
      nftIds: ownedItem?.nftIds || [],
      stakedAmount: Number(formatUnits(stakedItem.stakedAmount, likeCoinTokenDecimals)),
      pendingRewards: Number(formatUnits(stakedItem.pendingRewards, likeCoinTokenDecimals)),
      isOwned: !!ownedItem,
      acquiredAt: ownedItem?.acquiredAt || 0,
      lastOpenedTime: ownedItem?.lastOpenedTime || 0,
      progress: ownedItem?.progress || 0,
      archivedAt: ownedItem?.archivedAt ?? null,
      totalReadingTimeMs: ownedItem?.totalReadingTimeMs || 0,
      totalTTSListeningTimeMs: ownedItem?.totalTTSListeningTimeMs || 0,
    })
  })

  return items.sort((a, b) => b.stakedAmount - a.stakedAmount)
})

// Search narrows the active tab only. The tabs stay visible and the query
// survives a tab switch, so a book can be chased across reading states.
const isSearchOpen = ref(false)
const searchInputValue = ref('')
// Gated on my own shelf: the input only renders there, so a leftover query
// would otherwise keep filtering invisibly after navigating to another shelf.
const searchTerm = computed(() => {
  if (!isMyBookshelf.value) return ''
  return searchInputValue.value.trim().toLowerCase()
})
const hasSearchTerm = computed(() => !!searchTerm.value)

// Reads the metadata the shelf fetch already seeded into the query cache, so
// filtering stays synchronous and costs no extra requests.
function getBookSearchText(nftClassId: string) {
  const metadata = getNFTClassMetadataByIdFromCache(queryCache, nftClassId)
  if (!metadata) return ''
  return [
    metadata.name,
    getBookEntityName(metadata.author),
    getBookEntityName(metadata.publisher),
  ].filter(Boolean).join(' ').toLowerCase()
}

// Substring match, not token match: it has to work for CJK titles, which have
// no word boundaries to split on.
function filterBooksBySearchTerm<T extends { nftClassId: string }>(items: T[]) {
  if (!hasSearchTerm.value) return items
  return items.filter(item => getBookSearchText(item.nftClassId).includes(searchTerm.value))
}

const visibleReadingItems = computed(() => filterBooksBySearchTerm(readingItems.value))
const visibleFinishedItems = computed(() => filterBooksBySearchTerm(finishedItems.value))
const visibleDnfItems = computed(() => filterBooksBySearchTerm(dnfItems.value))
const visibleArchivedItems = computed(() => filterBooksBySearchTerm(archivedItems.value))
const visibleStakingItems = computed(() => filterBooksBySearchTerm(stakingItems.value))

function handleToggleSearch() {
  isSearchOpen.value = !isSearchOpen.value
  if (isSearchOpen.value) {
    useLogEvent('shelf_search_open', { tab: activeTab.value })
  }
  else {
    searchInputValue.value = ''
  }
}

function handleClearSearch() {
  searchInputValue.value = ''
}

const shelfTabs = computed(() => {
  const tabs: { value: ShelfTab, label: string }[] = []
  // Not metadata-gated (my shelf only), so the tab doesn't flash while metadata hydrates.
  if (readingItems.value.length > 0 || (isMyBookshelf.value && bookshelfStore.visiblePreLentNFTClassIds.length > 0)) {
    tabs.push({ value: 'reading', label: $t('bookshelf_tab_reading') })
  }
  if (stakingItems.value.length > 0) {
    tabs.push({ value: 'staking', label: $t('bookshelf_tab_staking') })
  }
  const isUploadedTabViaURL = queryTab.value === 'uploads'
  if (isUploadedBookVisible.value || (isUploadedTabViaURL && canUploadBook.value)) {
    tabs.push({
      value: 'uploads',
      label: $t('bookshelf_tab_uploads'),
    })
  }
  if (finishedItems.value.length > 0) {
    tabs.push({ value: 'finished', label: $t('bookshelf_tab_finished') })
  }
  if (dnfItems.value.length > 0) {
    tabs.push({ value: 'dnf', label: $t('bookshelf_tab_dnf') })
  }
  if (archivedItems.value.length > 0) {
    tabs.push({ value: 'archived', label: $t('bookshelf_tab_archived') })
  }
  return tabs
})

// nftClassIds is persisted, so on warm loads tabs can render before any fetch resolves.
const isTabsLoading = computed(() => {
  const hasAnyData = (
    (isMyBookshelf.value && bookshelfStore.visiblePreLentNFTClassIds.length > 0)
    || bookshelfStore.nftClassIds.length > 0
    || stakingData.value.items.length > 0
    || (isUploadedBookFeatureEnabled.value && hasUploadedBooks.value)
  )
  if (hasAnyData) return false
  return !bookshelfStore.hasFetched
})

const isCurrentTabFetching = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      return bookshelfStore.isFetching || bookshelfStore.isFetchingPreLentBooks
    case 'finished':
    case 'dnf':
      return bookshelfStore.isFetching
    case 'uploads':
      return uploadedBooksStore.isFetching
    case 'staking':
      return stakingData.value.isFetching
    case 'archived':
      return bookshelfStore.isFetching
    default:
      return false
  }
})

const isCurrentTabEmpty = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      if (!bookshelfStore.hasFetched || bookshelfStore.isFetchingPreLentBooks) return false
      return readingItems.value.length === 0
    case 'finished':
      if (!bookshelfStore.hasFetched) return false
      return finishedItems.value.length === 0
    case 'dnf':
      if (!bookshelfStore.hasFetched) return false
      return dnfItems.value.length === 0
    case 'uploads':
      if (!uploadedBooksStore.hasFetched) return false
      return !hasUploadedBooks.value
    case 'staking':
      if (!stakingData.value.hasFetched) return false
      return stakingItems.value.length === 0
    case 'archived':
      if (!bookshelfStore.hasFetched) return false
      return archivedItems.value.length === 0
    default:
      return false
  }
})

const currentTabEmptyMessage = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      return $t('bookshelf_no_items_reading')
    case 'finished':
      return $t('bookshelf_no_items_finished')
    case 'dnf':
      return $t('bookshelf_no_items_dnf')
    case 'uploads':
      return $t('bookshelf_no_items_uploads')
    case 'staking':
      return $t('bookshelf_no_items_staking')
    case 'archived':
      return $t('bookshelf_no_items_archived')
    default:
      return $t('bookshelf_no_items')
  }
})

// Counts the rendered (post-search) items so the ragged-last-row trimming in
// usePaginatedGrid measures the grid it is actually laying out.
const itemsCount = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      return visibleReadingItems.value.length
    case 'finished':
      return visibleFinishedItems.value.length
    case 'dnf':
      return visibleDnfItems.value.length
    case 'uploads':
      return visibleUploadedBookItems.value.length
    case 'staking':
      return visibleStakingItems.value.length
    case 'archived':
      return visibleArchivedItems.value.length
    default:
      return bookshelfStore.items.length
  }
})

// Distinct from isCurrentTabEmpty: the tab has books, the query just matched none.
const isSearchResultEmpty = computed(() => {
  return hasSearchTerm.value
    && !isCurrentTabFetching.value
    && itemsCount.value === 0
    && !isCurrentTabEmpty.value
})

const paramWalletAddress = computed(() => getRouteParam('walletAddress'))

if (paramWalletAddress.value && !checkIsEVMAddress(paramWalletAddress.value)) {
  throw createError({ statusCode: 404, message: $t('error_page_not_found') })
}

watch(paramWalletAddress, (value) => {
  if (value && !checkIsEVMAddress(value)) {
    showError({ statusCode: 404, message: $t('error_page_not_found') })
  }
})

const walletAddress = computed(() => {
  return (paramWalletAddress.value || user.value?.evmWallet)?.toLowerCase()
})

const isMyBookshelf = computed(() => {
  return walletAddress.value === user.value?.evmWallet?.toLowerCase()
})

const isGuestShelf = computed(() => !walletAddress.value && !hasLoggedIn.value)

// Only someone else's shelf needs a fetch — its title renders the owner's name.
// One's own shelf reads whatever other pages have already cached.
const shelfOwnerQuery = useLikerInfoByWalletAddressQuery(walletAddress, {
  enabled: () => !isMyBookshelf.value,
})
const shelfOwner = computed(() => shelfOwnerQuery.data.value)
const shelfOwnerDisplayName = computed(() => {
  return shelfOwner.value?.displayName || shelfOwner.value?.evmWallet
})
const shelfOwnerWalletAddress = computed(() => {
  return shelfOwner.value?.evmWallet || walletAddress.value
})

// Registered before any `await` in setup: a composable that adds an unmount
// hook must run synchronously, otherwise a redirect that unmounts the page
// mid-Suspense leaves the head entry uncreated and crashes on teardown.
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

// Await so the owner name lands in the SSR title. The guard is required because
// refresh() bypasses the enabled gate and would fetch one's own (or an empty)
// wallet; it resolves error states instead of rejecting, so no catch is needed.
if (!isMyBookshelf.value && walletAddress.value) {
  await shelfOwnerQuery.refresh()
}

const isOnline = useOnline()
const { offlineCacheKeys, refreshOfflineBooks, removeOfflineBook } = useOfflineBooks()
const retryActions = computed(() => [{
  label: $t('bookshelf_refresh_failed_retry'),
  color: 'warning' as const,
  variant: 'soft' as const,
  loading: bookshelfStore.isFetching,
  onClick: () => {
    if (walletAddress.value) loadBookshelfData(walletAddress.value, { isRefresh: true })
  },
}])
const shelfNotice = computed(() => {
  if (!isMyBookshelf.value) return null
  if (!isOnline.value) {
    return {
      title: $t('bookshelf_offline_notice'),
      description: $t('bookshelf_offline_notice_description'),
      icon: 'i-material-symbols-signal-wifi-off-outline-rounded',
      color: 'neutral' as const,
    }
  }
  if (bookshelfStore.lastError) {
    return {
      title: $t('bookshelf_refresh_failed_notice'),
      description: undefined,
      icon: 'i-material-symbols-cloud-off-outline-rounded',
      color: 'warning' as const,
      // Suppress the Retry button while a fetch is already in flight to avoid
      // double-taps; keep the banner visible so the error context doesn't flash.
      actions: retryActions.value,
    }
  }
  return null
})

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
})

async function loadBookshelfData(addr: string, { isRefresh = false } = {}) {
  const promises: Promise<unknown>[] = [
    bookshelfStore.fetchAllItems({ walletAddress: addr, isRefresh }),
  ]
  if (isMyBookshelf.value) {
    promises.push(
      bookshelfStore.fetchPreLentBooks(),
      stakingStore.fetchUserStakingData(user.value!.evmWallet),
      // Unconditional (not Plus-gated): lapsed users still see locked borrows.
      bookshelfStore.fetchPlusReadingBooks(),
    )
    if (isUploadedBookFeatureEnabled.value) {
      promises.push(uploadedBooksStore.fetchItems({ force: isRefresh }))
    }
  }
  // allSettled: one failing source shouldn't mask persisted shelf data.
  await Promise.allSettled(promises)
}

const uploadedBookItems = computed(() => uploadedBooksStore.items)
const hasUploadedBooks = computed(() => uploadedBookItems.value.length > 0)

// Uploads carry their own name and have no on-chain author/publisher to match.
const visibleUploadedBookItems = computed(() => {
  if (!hasSearchTerm.value) return uploadedBookItems.value
  return uploadedBookItems.value.filter(item => item.name?.toLowerCase().includes(searchTerm.value))
})

async function handleDeleteUploadedBook(bookId: string) {
  const result = await deleteModal.open({ bookId }).result
  // Only on a confirmed delete: a dismissed modal leaves the book on the shelf,
  // where its cached file is still what makes it readable offline.
  if (result?.isDeleted) await removeOfflineBook({ nftClassId: bookId, isUploadedBook: true })
}

onMounted(async () => {
  // Not awaited with the shelf data: which books are cached is independent of
  // the network round-trip, and offline it is the only status worth showing.
  refreshOfflineBooks()
  if (walletAddress.value) {
    await loadBookshelfData(walletAddress.value)
  }
})

/* Personalized recommendations (own shelf only) */

const { fetchBookRecommendations } = useBookRecommendations()
const isReadNextModalOpen = ref(false)
// Ids and `isPersonalized` stay in one ref: both are assigned after an await, and
// splitting them lets one fetch's ids pair with another fetch's provenance flag.
const readNextBooks = ref<BookRecommendations>(getEmptyBookRecommendations())

// PostHog loads lazily via @nuxt/scripts, so the flag may resolve after onMounted.
watch(
  [isUploadedBookFeatureEnabled, hasLoggedIn, walletAddress],
  ([isEnabled, hasLoggedInValue, walletAddressValue]) => {
    if (
      isEnabled
      && hasLoggedInValue
      && walletAddressValue
      && isMyBookshelf.value
      && !uploadedBooksStore.hasFetched
      && !uploadedBooksStore.isFetching
    ) {
      uploadedBooksStore.fetchItems()
    }
  },
)

onUnmounted(() => {
  if (paramWalletAddress.value) {
    bookshelfStore.reset()
  }
})

watch(
  walletAddress,
  async (value, oldValue) => {
    // Skip reset on initial session-hydration (undefined → wallet) so it
    // doesn't wipe state just hydrated from persisted storage. On account
    // switch, drop the previous viewer's uploads so they don't leak into
    // another user's shelf.
    const isAccountSwitch = oldValue !== undefined && oldValue !== value
    if (isAccountSwitch) {
      bookshelfStore.reset()
      uploadedBooksStore.reset()
    }
    if (value) {
      await loadBookshelfData(value, { isRefresh: isAccountSwitch })
    }
  },
)

// If the session hydrates after the page mounts with an explicit
// `/shelf/0xMyAddr` URL, `isMyBookshelf` flips from false → true without
// `walletAddress` changing, so the initial `loadBookshelfData` skipped the
// my-only fetches (uploads, staking, pre-lent books). Re-trigger once here.
watch(isMyBookshelf, async (isMine, wasMine) => {
  if (isMine && !wasMine && walletAddress.value) {
    await loadBookshelfData(walletAddress.value)
  }
})

function getShelfItemType(nftClassId?: string) {
  if (!nftClassId) return undefined
  const normalizedNFTClassId = nftClassId.toLowerCase()
  if (bookshelfStore.nftClassIds.includes(normalizedNFTClassId)) return 'owned'
  if (bookshelfStore.plusReadingBookIds.includes(normalizedNFTClassId)) return 'borrowed'
  if (bookshelfStore.preLentNFTClassIds.includes(normalizedNFTClassId)) return 'pre_lent'
  return undefined
}

function handleBookshelfItemOpen({
  type,
  nftClassId,
  isTTS,
}: {
  type: string
  name: string
  nftClassId?: string
  index?: number
  isTTS?: boolean
}) {
  useLogEvent('shelf_open_book', {
    content_type: type,
    nft_class_id: nftClassId,
    shelf_item_type: getShelfItemType(nftClassId),
    ...(isTTS && { tts: '1' }),
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

function handleMarkBookAsReading(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_mark_book_reading', { nft_class_id: nftClassId })
  bookshelfStore.markBookAsReading(nftClassId)
}

async function handleMarkBookAsFinished(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_mark_book_finished', { nft_class_id: nftClassId })
  bookshelfStore.markBookAsFinished(nftClassId)

  // Suggest what to read next, seeded by the finished book; an empty result
  // (guest, error, no candidates) simply skips the modal. Finishing a borrowed
  // book suggests library picks, so the next read stays included in Plus.
  const shelfItemType = getShelfItemType(nftClassId)
  const recommendations = await fetchBookRecommendations({
    seed: nftClassId,
    limit: 6,
    isLibrary: shelfItemType === 'borrowed',
  })
  if (recommendations.nftClassIds.length === 0) return
  readNextBooks.value = recommendations
  isReadNextModalOpen.value = true
  useLogEvent('shelf_read_next_modal_open', {
    nft_class_id: nftClassId,
    shelf_item_type: shelfItemType,
    is_personalized: recommendations.isPersonalized,
  })
}

// The store owns the whole return: borrow drop + pre-lent tombstone.
function handleReturnPlusReadingBook(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_return_plus_reading_book', { nft_class_id: nftClassId })
  bookshelfStore.returnBook(nftClassId)
  // The reader reads its cache before the network, and a still-active Plus
  // member re-satisfies the borrow gate — so a returned book left in the cache
  // would keep opening from local bytes as if it had never been returned.
  removeOfflineBook({ nftClassId })
  toast.add({
    title: $t('bookshelf_plus_reading_returned_toast'),
    icon: 'i-material-symbols-assignment-return-outline-rounded',
    color: 'neutral',
  })
}

function handleMarkBookAsDidNotFinish(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_mark_book_dnf', { nft_class_id: nftClassId })
  bookshelfStore.markBookAsDidNotFinish(nftClassId)
}

function handleArchiveBook(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_archive_book', { nft_class_id: nftClassId })
  bookshelfStore.archiveBook(nftClassId)
}

function handleUnarchiveBook(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_unarchive_book', { nft_class_id: nftClassId })
  bookshelfStore.unarchiveBook(nftClassId)
}
</script>
