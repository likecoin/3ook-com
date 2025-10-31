<template>
  <div>
    <header
      class="flex gap-6 w-full max-w-[1440px] mx-auto px-4 laptop:px-12 py-4"
    >
      <div
        v-if="!isMyBookshelf"
        class="flex items-center gap-2 overflow-hidden"
      >
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

      <template
        v-else-if="isMyBookshelf && hasLoggedIn && hasAnyStakes"
      >
        <div
          class="flex items-center gap-2 overflow-hidden"
        >
          <UAvatar
            :src="user?.avatar"
            :alt="userDisplayName"
            icon="i-material-symbols-person-2-rounded"
            size="3xl"
          />

          <div class="overflow-hidden">
            <p
              v-if="userDisplayName"
              class="font-medium text-highlighted text-sm"
              v-text="userDisplayName"
            />
            <p
              v-if="user?.evmWallet"
              :class="[
                userDisplayName ? 'text-muted' : 'text-highlighted',
                'text-xs',
                'text-ellipsis',
                'font-mono',
                'overflow-hidden',
                'whitespace-nowrap',
              ]"
              v-text="user.evmWallet"
            />
          </div>
        </div>

        <div
          class="flex items-center gap-3"
        >
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-lg font-bold text-green-500">
                {{ formattedTotalRewards }}
              </span>
              <span class="text-xs text-gray-500">LIKE</span>
            </div>
            <p class="text-xs text-gray-600">
              {{ $t('staking_dashboard_total_rewards') }}
            </p>
          </div>
          <UButton
            v-if="totalUnclaimedRewards > 0n"
            :label="$t('staking_claim_all_rewards')"
            color="success"
            size="sm"
            :loading="isClaimingAllRewards"
            @click="handleClaimAllRewards"
          />
        </div>
      </template>
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
      <ul
        v-else
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
          :staked-amount="item.stakedAmount"
          :pending-rewards="item.pendingRewards"
          :is-owned="item.isOwned"
          :lazy="index >= columnMax"
          @open="handleBookshelfItemOpen"
          @download="handleBookshelfItemDownload"
        />
      </ul>
      <div
        v-if="bookshelfStore.isFetching || hasMoreItems"
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
import { formatUnits } from 'viem'

const { likeCoinTokenDecimals } = useRuntimeConfig().public
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const getRouteParam = useRouteParam()
const bookshelfStore = useBookshelfStore()
const metadataStore = useMetadataStore()
const stakingStore = useStakingStore()
const { handleError } = useErrorHandler()
const toast = useToast()
const {
  isLoading: isLoadingClaimableFreeBooks,
  nftClassIds: claimableNFTClassIds,
  count: claimableFreeBooksCount,
  fetchClaimableFreeBooks,
  claimFreeBook,
  reset: resetClaimableBooks,
} = useClaimableBooks()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)

const { claimWalletRewards } = useLikeCollectiveContract()
const { restoreConnection } = useAccountStore()
const isClaimingAllRewards = ref(false)

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

const totalUnclaimedRewards = computed(() => stakingData.value.totalUnclaimedRewards)

const formattedTotalRewards = computed(() => {
  return isMyBookshelf.value ? stakingStore.getFormattedTotalRewards(user.value!.evmWallet) : '0'
})

const hasAnyStakes = computed(() => {
  return stakingData.value.items.length > 0
})

const bookshelfItemsWithStaking = computed(() => {
  const items = bookshelfStore.items.map((item) => {
    const stakingItem = stakingData.value.items.find(
      s => s.nftClassId.toLowerCase() === item.nftClassId.toLowerCase(),
    )
    return {
      ...item,
      stakedAmount: stakingItem ? Number(formatUnits(stakingItem.stakedAmount, likeCoinTokenDecimals)) : 0,
      pendingRewards: stakingItem ? Number(formatUnits(stakingItem.pendingRewards, likeCoinTokenDecimals)) : 0,
      isOwned: true,
    }
  })

  // Sort: owned books first, then by staked amount (desc), then by original order
  return items.sort((a, b) => {
    // If not my bookshelf, don't sort by staking
    if (!isMyBookshelf.value) return 0

    // Sort by staked amount descending
    if (a.stakedAmount !== b.stakedAmount) {
      return b.stakedAmount - a.stakedAmount
    }

    // Keep original order if staked amounts are equal
    return 0
  })
})

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

const userDisplayName = computed(() => {
  return user.value?.displayName || user.value?.evmWallet
})

const totalItemsCount = computed(() => {
  return claimableFreeBooksCount.value + itemsCount.value
})

const isEmpty = computed(() => {
  return (
    totalItemsCount.value === 0
    && !bookshelfStore.isFetching
    && bookshelfStore.hasFetched
    && !isLoadingClaimableFreeBooks
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
  hasMore: hasMoreItems,
})

onMounted(async () => {
  if (walletAddress.value) {
    if (isMyBookshelf.value) {
      await Promise.all([
        fetchClaimableFreeBooks(),
        stakingStore.fetchUserStakingData(user.value!.evmWallet),
      ])
    }
    await bookshelfStore.fetchItems({ walletAddress: walletAddress.value })
  }
})

watch(
  walletAddress,
  async (value) => {
    bookshelfStore.reset()
    resetClaimableBooks()
    if (value) {
      if (isMyBookshelf.value) {
        await Promise.all([
          fetchClaimableFreeBooks(),
          stakingStore.fetchUserStakingData(user.value!.evmWallet, { isRefresh: true }),
        ])
      }
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

async function handleClaimAllRewards() {
  if (!isMyBookshelf.value || !hasLoggedIn.value) return

  try {
    await restoreConnection()

    isClaimingAllRewards.value = true

    await claimWalletRewards(user.value!.evmWallet)
    await sleep(3000)

    toast.add({
      title: $t('staking_claim_all_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('claim_all_rewards_success', {
      total_amount: formatUnits(totalUnclaimedRewards.value, likeCoinTokenDecimals),
      book_count: bookshelfStore.items.length,
    })

    // Reload data to refresh rewards
    if (isMyBookshelf.value && walletAddress.value) {
      await Promise.all([
        stakingStore.fetchUserStakingData(walletAddress.value, { isRefresh: true }),
        bookshelfStore.fetchItems({ walletAddress: walletAddress.value, isRefresh: true }),
      ])
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_all_rewards_error'),
    })
  }
  finally {
    isClaimingAllRewards.value = false
  }
}

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

async function handleBookClaim(nftClassId: string) {
  useLogEvent('shelf_claim_free_book', { nft_class_id: nftClassId })
  await claimFreeBook(nftClassId)
  await bookshelfStore.fetchItems({ walletAddress: walletAddress.value as string, isRefresh: true })
}
</script>
