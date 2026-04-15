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
      <div
        v-else-if="isEmpty"
        class="flex flex-col items-center m-auto py-12"
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
      <template v-else>
        <div
          v-if="isUploadedBookFeatureEnabled && isMyBookshelf && (hasUploadedBooks || (isLikerPlus && !isExpiredLikerPlus))"
          class="w-full mt-4"
        >
          <div class="flex items-center justify-between mb-3">
            <h2
              v-if="hasUploadedBooks"
              class="text-sm font-bold text-highlighted"
            >
              {{ $t('uploaded_book_section_title') }}
            </h2>
            <UploadBookModal
              v-if="isLikerPlus && !isExpiredLikerPlus"
              class="ml-auto"
              size="sm"
              variant="soft"
              @uploaded="loadBookshelfData(walletAddress!, { isRefresh: true })"
            />
          </div>
          <ul
            v-if="hasUploadedBooks"
            :class="[...gridClasses, 'w-full']"
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
        </div>

        <ul
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
            v-for="(item, index) in bookshelfItemsWithStaking"
            :id="item.nftClassId"
            :key="item.nftClassId"
            :class="getGridItemClassesByIndex(index)"
            :nft-class-id="item.nftClassId"
            :nft-ids="item.nftIds"
            :is-owned="item.isOwned"
            :progress="item.progress"
            :lazy="index >= columnMax"
            @open="handleBookshelfItemOpen"
            @download="handleBookshelfItemDownload"
          />
        </ul>
      </template>
      <div
        v-if="bookshelfStore.isFetching"
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
import { formatUnits } from 'viem'
import { DeleteUploadedBookModal } from '#components'

import type { BookshelfItem } from '~/stores/bookshelf'
import type { StakingItem } from '~/stores/staking'

interface BookshelfItemWithStaking extends BookshelfItem {
  stakedAmount: number
  pendingRewards: number
  isOwned: boolean
}

const { likeCoinTokenDecimals } = useRuntimeConfig().public
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const getRouteParam = useRouteParam()
const bookshelfStore = useBookshelfStore()
const uploadedBooksStore = useUploadedBooksStore()
const metadataStore = useMetadataStore()
const stakingStore = useStakingStore()
const { isLikerPlus, isExpiredLikerPlus } = useSubscription()
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

const bookshelfItemsWithStaking = computed<BookshelfItemWithStaking[]>(() => {
  const ownedItemsByNFTClassId = new Map(
    bookshelfStore.items.map(item => [
      item.nftClassId.toLowerCase(),
      item,
    ]),
  )

  const stakedItemsByNFTClassId = new Map(
    stakingData.value.items.map(item => [
      item.nftClassId.toLowerCase(),
      item,
    ]),
  )

  const items = bookshelfStore.items.map((bookshelfItem) => {
    const normalizedNFTClassId = bookshelfItem.nftClassId.toLowerCase()
    const stakedItem = stakedItemsByNFTClassId.get(normalizedNFTClassId)

    return {
      ...bookshelfItem,
      stakedAmount: stakedItem ? Number(formatUnits(stakedItem.stakedAmount, likeCoinTokenDecimals)) : 0,
      pendingRewards: stakedItem ? Number(formatUnits(stakedItem.pendingRewards, likeCoinTokenDecimals)) : 0,
      isOwned: true,
    }
  })

  stakingData.value.items.forEach((stakedItem: StakingItem) => {
    const normalizedNFTClassId = stakedItem.nftClassId.toLowerCase()
    if (!ownedItemsByNFTClassId.has(normalizedNFTClassId)) {
      items.push({
        nftClassId: stakedItem.nftClassId,
        nftIds: [],
        stakedAmount: Number(formatUnits(stakedItem.stakedAmount, likeCoinTokenDecimals)),
        pendingRewards: Number(formatUnits(stakedItem.pendingRewards, likeCoinTokenDecimals)),
        isOwned: false,
        lastOpenedTime: 0,
        progress: 0,
      })
    }
  })

  // Sort: owned books first, then by staked amount (desc), then by original order
  return items.sort((a, b) => {
    // If not my bookshelf, don't sort by staking
    if (!isMyBookshelf.value) return 0

    if (a.isOwned !== b.isOwned) {
      return a.isOwned ? -1 : 1
    }

    const aOpened = a.progress > 0
    const bOpened = b.progress > 0
    // Opened books come before unopened books
    if (aOpened !== bOpened) {
      return aOpened ? -1 : 1
    }

    // Both opened (or both unopened): for opened, sort by lastOpenedTime (desc)
    if (aOpened && bOpened && a.lastOpenedTime !== b.lastOpenedTime) {
      return b.lastOpenedTime - a.lastOpenedTime
    }

    // Finally sort by staked amount
    return b.stakedAmount - a.stakedAmount
  })
})

const itemsCount = computed(() => bookshelfStore.items.length)
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

const totalItemsCount = computed(() => {
  const uploadedCount = isMyBookshelf.value ? uploadedBookItems.value.length : 0
  return claimableFreeBooksCount.value + itemsCount.value + uploadedCount
})

const isEmpty = computed(() => {
  return (
    totalItemsCount.value === 0
    && !bookshelfStore.isFetching
    && bookshelfStore.hasFetched
    && !isLoadingClaimableFreeBooks
    && (!isMyBookshelf.value || uploadedBooksStore.hasFetched)
  )
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
      uploadedBooksStore.fetchItems({ force: isRefresh }),
    )
  }
  await Promise.all(promises)
}

const uploadedBookItems = computed(() => uploadedBooksStore.items)
const hasUploadedBooks = computed(() => uploadedBookItems.value.length > 0)
const isUploadedBookAccessible = computed(() => isLikerPlus.value && !isExpiredLikerPlus.value)

function handleDeleteUploadedBook(bookId: string) {
  deleteModal.open({ bookId })
}

onMounted(async () => {
  if (walletAddress.value) {
    await loadBookshelfData(walletAddress.value)
  }
})

onUnmounted(() => {
  if (paramWalletAddress.value) {
    bookshelfStore.reset()
    resetClaimableBooks()
  }
})

watch(
  walletAddress,
  async (value) => {
    bookshelfStore.reset()
    resetClaimableBooks()
    // Drop the previous viewer's uploads so they don't leak into another
    // user's shelf (affects `totalItemsCount` and the empty-state logic).
    uploadedBooksStore.reset()
    if (value) {
      await loadBookshelfData(value, { isRefresh: true })
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

async function handleBookClaim(nftClassId: string) {
  useLogEvent('shelf_claim_free_book', { nft_class_id: nftClassId })
  await claimFreeBook(nftClassId)
  await bookshelfStore.fetchAllItems({ walletAddress: walletAddress.value as string, isRefresh: true })
}
</script>
