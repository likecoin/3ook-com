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
        :icon="shelfNotice.icon"
        :color="shelfNotice.color"
        variant="subtle"
        :actions="shelfNotice.actions"
      />
      <UCard
        v-if="!walletAddress && !hasLoggedIn"
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
        <!-- Tab selector -->
        <header
          v-if="isMyBookshelf"
          class="flex items-center gap-2 w-full mt-4"
        >
          <PillButtonGroup
            v-model="activeTab"
            :items="shelfTabs"
            :is-loading="isTabsLoading"
            class="grow min-w-0"
          />
          <UploadBookModal
            v-if="canUploadBook"
            @uploaded="loadBookshelfData(walletAddress!, { isRefresh: true })"
          >
            <PillButton
              class="max-laptop:hidden ml-auto"
              :label="$t('uploaded_book_upload_button')"
              icon="i-material-symbols-upload-rounded"
            />
          </UploadBookModal>
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
            <template v-if="isMyBookshelf">
              <BookshelfItem
                v-for="(nftClassId, index) in claimableNFTClassIds"
                :id="nftClassId"
                :key="nftClassId"
                :class="getGridItemClassesByIndex(index)"
                :nft-class-id="nftClassId"
                :lazy="index >= columnMax"
                :is-claimable="true"
                @claim="handleBookClaim"
              />
            </template>
            <BookshelfItem
              v-for="(item, index) in readingItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(claimableNFTClassIds.length + index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="isMyBookshelf"
              :can-archive="isMyBookshelf"
              :can-edit-reading-state="isMyBookshelf"
              :is-finished="item.completedAt != null"
              :is-did-not-finish="item.didNotFinishAt != null"
              :progress="item.progress"
              :lazy="(claimableNFTClassIds.length + index) >= columnMax"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-finished="handleMarkBookAsFinished"
              @mark-as-did-not-finish="handleMarkBookAsDidNotFinish"
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
              v-for="(item, index) in finishedItems"
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
              :lazy="index >= columnMax"
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
              v-for="(item, index) in dnfItems"
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
              :lazy="index >= columnMax"
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
              v-for="(item, index) in uploadedBookItems"
              :key="item.id"
              :class="getGridItemClassesByIndex(index)"
              :book-id="item.id"
              :content-type="item.contentType"
              :progress="item.progress"
              :lazy="index >= columnMax"
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
              v-for="(item, index) in stakingItems"
              :id="item.nftClassId"
              :key="item.nftClassId"
              :class="getGridItemClassesByIndex(index)"
              :nft-class-id="item.nftClassId"
              :nft-ids="item.nftIds"
              :is-owned="item.isOwned"
              :is-archived="item.archivedAt != null"
              :can-archive="isMyBookshelf"
              :progress="item.progress"
              :staked-like="item.stakedAmount"
              :lazy="index >= columnMax"
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
              v-for="(item, index) in archivedItems"
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
              :lazy="index >= columnMax"
              @open="handleBookshelfItemOpen"
              @download="handleBookshelfItemDownload"
              @mark-as-reading="handleMarkBookAsReading"
              @mark-as-finished="handleMarkBookAsFinished"
              @mark-as-did-not-finish="handleMarkBookAsDidNotFinish"
              @unarchive="handleUnarchiveBook"
            />
          </ul>

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
  </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { DeleteUploadedBookModal } from '#components'

import type { BookshelfItem } from '~/stores/bookshelf'
import type { StakingItem } from '~/stores/staking'

type ShelfTab = 'reading' | 'finished' | 'dnf' | 'uploads' | 'staking' | 'archived'

interface BookshelfItemWithStaking extends BookshelfItem {
  stakedAmount: number
  pendingRewards: number
  isOwned: boolean
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
const uploadedBooksStore = useUploadedBooksStore()
const metadataStore = useMetadataStore()
const stakingStore = useStakingStore()
const { isLikerPlus, isExpiredLikerPlus } = useSubscription()
const { isApp } = useAppDetection()
const isUploadedBookFeatureEnabled = useFeatureFlagEnabled('plus-upload-files')
const {
  isLoading: isLoadingClaimableFreeBooks,
  nftClassIds: claimableNFTClassIds,
  count: claimableFreeBooksCount,
  fetchClaimableFreeBooks,
  claimFreeBook,
  reset: resetClaimableBooks,
} = useClaimableBooks()

const overlay = useOverlay()
const deleteModal = overlay.create(DeleteUploadedBookModal)

const isUploadedBookAccessible = computed(() => isLikerPlus.value && !isExpiredLikerPlus.value)
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

// Reading tab: owned books (excluding archived, finished, DNF) sorted by last opened time (opened first), then the rest
const readingItems = computed(() => {
  return bookshelfItemsAll.value
    .filter(item => !isMyBookshelf.value || (item.archivedAt == null && item.completedAt == null && item.didNotFinishAt == null))
    .sort((a, b) => {
      const aOpened = a.progress > 0
      const bOpened = b.progress > 0
      if (aOpened !== bOpened) return aOpened ? -1 : 1
      if (aOpened && bOpened && a.lastOpenedTime !== b.lastOpenedTime) {
        return b.lastOpenedTime - a.lastOpenedTime
      }
      return 0
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
      lastOpenedTime: ownedItem?.lastOpenedTime || 0,
      progress: ownedItem?.progress || 0,
      archivedAt: ownedItem?.archivedAt ?? null,
    })
  })

  return items.sort((a, b) => b.stakedAmount - a.stakedAmount)
})

const shelfTabs = computed(() => {
  const tabs: { value: ShelfTab, label: string }[] = []
  if (readingItems.value.length > 0 || claimableFreeBooksCount.value > 0) {
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

const isTabsLoading = computed(() => (
  !bookshelfStore.hasFetched
  || (
    isUploadedBookFeatureEnabled.value
    && !uploadedBooksStore.hasFetched
  )
  || !stakingData.value.hasFetched
))

const isCurrentTabFetching = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      return bookshelfStore.isFetching || isLoadingClaimableFreeBooks.value
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
      if (!bookshelfStore.hasFetched || isLoadingClaimableFreeBooks.value) return false
      return readingItems.value.length === 0 && claimableFreeBooksCount.value === 0
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

const itemsCount = computed(() => {
  switch (activeTab.value) {
    case 'reading':
      return claimableFreeBooksCount.value + readingItems.value.length
    case 'finished':
      return finishedItems.value.length
    case 'dnf':
      return dnfItems.value.length
    case 'uploads':
      return uploadedBookItems.value.length
    case 'staking':
      return stakingItems.value.length
    case 'archived':
      return archivedItems.value.length
    default:
      return bookshelfStore.items.length
  }
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

const isOnline = useOnline()
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
      icon: 'i-material-symbols-signal-wifi-off-outline-rounded',
      color: 'neutral' as const,
    }
  }
  if (bookshelfStore.lastError) {
    return {
      title: $t('bookshelf_refresh_failed_notice'),
      icon: 'i-material-symbols-cloud-off-outline-rounded',
      color: 'warning' as const,
      // Suppress the Retry button while a fetch is already in flight to avoid
      // double-taps; keep the banner visible so the error context doesn't flash.
      actions: retryActions.value,
    }
  }
  return null
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
})

async function loadBookshelfData(addr: string, { isRefresh = false } = {}) {
  const promises: Promise<unknown>[] = [
    bookshelfStore.fetchAllItems({ walletAddress: addr, isRefresh }),
  ]
  if (isMyBookshelf.value) {
    promises.push(
      fetchClaimableFreeBooks(),
      stakingStore.fetchUserStakingData(user.value!.evmWallet),
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

function handleDeleteUploadedBook(bookId: string) {
  deleteModal.open({ bookId })
}

onMounted(async () => {
  if (walletAddress.value) {
    await loadBookshelfData(walletAddress.value)
  }
})

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
    resetClaimableBooks()
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
      resetClaimableBooks()
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
// my-only fetches (uploads, staking, claimables). Re-trigger once here.
watch(isMyBookshelf, async (isMine, wasMine) => {
  if (isMine && !wasMine && walletAddress.value) {
    await loadBookshelfData(walletAddress.value)
  }
})

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

function handleMarkBookAsFinished(nftClassId: string) {
  if (!isMyBookshelf.value) return
  useLogEvent('shelf_mark_book_finished', { nft_class_id: nftClassId })
  bookshelfStore.markBookAsFinished(nftClassId)
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

async function handleBookClaim(nftClassId: string) {
  useLogEvent('shelf_claim_free_book', { nft_class_id: nftClassId })
  await claimFreeBook(nftClassId)
  await bookshelfStore.fetchAllItems({ walletAddress: walletAddress.value as string, isRefresh: true })
}
</script>
