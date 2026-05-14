<template>
  <main class="space-y-4">
    <section
      v-if="hasLoggedIn"
      class="space-y-3"
    >
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('burn_page_title')"
      />

      <UAlert
        icon="i-material-symbols-warning-outline-rounded"
        color="error"
        variant="subtle"
        :title="$t('burn_page_warning_title')"
        :description="$t('burn_page_warning_description')"
      />

      <UCard
        :ui="{
          body: [
            '!p-0',
            'divide-y-1',
            'divide-(--ui-border)',
            '[&>*:not(:first-child)]:rounded-t-none',
            '[&>*:not(:last-child)]:rounded-b-none',
          ].join(' '),
        }"
      >
        <div
          v-if="isLoading"
          class="flex justify-center py-12"
        >
          <UIcon
            class="animate-spin"
            name="material-symbols-progress-activity"
            size="48"
          />
        </div>

        <div
          v-else-if="isEmpty"
          class="flex flex-col items-center py-12"
        >
          <UIcon
            class="opacity-20"
            name="i-material-symbols-menu-book-outline-rounded"
            size="64"
          />
          <p
            class="mt-4 text-muted"
            v-text="$t('burn_page_no_books')"
          />
        </div>

        <div
          v-else
          class="divide-y-1 divide-(--ui-border)"
        >
          <div
            v-for="item in items"
            :key="`${item.nftClassId}-${item.nftId}`"
            class="flex items-center gap-3 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p
                class="text-sm font-medium text-highlighted truncate"
                v-text="item.bookTitle"
              />
              <p
                class="text-xs text-muted font-mono truncate"
                v-text="`${$t('burn_page_class_id')}: ${item.nftClassId}`"
              />
              <p
                class="text-xs text-muted font-mono truncate"
                v-text="`${$t('burn_page_nft_id')}: ${item.nftId}`"
              />
            </div>

            <UButton
              :label="$t('burn_page_burn_button')"
              color="error"
              variant="outline"
              size="sm"
              :disabled="isBurning"
              @click="handleBurnClick(item)"
            />
          </div>
        </div>
      </UCard>
    </section>

    <UModal
      v-model:open="isConfirmDialogOpen"
      :ui="{
        title: 'text-lg font-bold',
        footer: 'flex justify-end gap-3',
      }"
    >
      <template #title>
        <span v-text="$t('burn_page_confirm_title')" />
      </template>

      <template #body>
        <div class="space-y-4">
          <p
            class="text-sm"
            v-text="$t('burn_page_confirm_description', { book: selectedNFT?.bookTitle })"
          />

          <div class="space-y-2 text-sm text-muted">
            <p
              class="font-mono"
              v-text="`${$t('burn_page_class_id')}: ${selectedNFT?.nftClassId}`"
            />
            <p
              class="font-mono"
              v-text="`${$t('burn_page_nft_id')}: ${selectedNFT?.nftId}`"
            />
          </div>

          <UAlert
            icon="i-material-symbols-warning-outline-rounded"
            color="error"
            variant="subtle"
            :title="$t('burn_page_confirm_warning')"
          />
        </div>
      </template>

      <template #footer>
        <UButton
          :label="$t('common_cancel')"
          variant="outline"
          color="neutral"
          @click="isConfirmDialogOpen = false"
        />
        <UButton
          :label="$t('burn_page_confirm_burn')"
          color="error"
          :loading="isBurning"
          @click="confirmBurn"
        />
      </template>
    </UModal>
  </main>
</template>

<script setup lang="ts">
import { waitForTransactionReceipt } from '@wagmi/core'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const bookshelfStore = useBookshelfStore()
const nftStore = useNFTStore()
const { burnNFT } = useLikeNFTClassContract()
const { $wagmiConfig } = useNuxtApp()
const { handleError } = useErrorHandler()
const toast = useToast()
const accountStore = useAccountStore()

useHead({
  title: $t('burn_page_title'),
})

const isLoading = ref(false)
const isBurning = ref(false)

type BookItem = {
  nftClassId: string
  nftId: string
  bookTitle: string
}

const items = computed<BookItem[]>(() => {
  const result: BookItem[] = []

  for (const item of bookshelfStore.items) {
    const { nftClassId } = item
    const nftIds = bookshelfStore.getTokenIdsByNFTClassId(nftClassId)
    const metadata = nftStore.getNFTClassMetadataById(nftClassId)

    if (!metadata || metadata['@type'] !== 'Book') continue

    const bookTitle = metadata.name || nftClassId

    for (const nftId of nftIds) {
      result.push({
        nftClassId,
        nftId,
        bookTitle,
      })
    }
  }

  return result.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle))
})

const isEmpty = computed(() => items.value.length === 0 && !isLoading.value)

async function fetchBooks() {
  if (!user.value?.evmWallet) return

  isLoading.value = true
  try {
    // Fetch NFT classes first
    await bookshelfStore.fetchItems({
      walletAddress: user.value.evmWallet,
      isRefresh: true,
    })

    // Fetch token IDs for each NFT class from contract
    const nftClassIds = Array.from(bookshelfStore.items.map(i => i.nftClassId))
    await Promise.all(
      nftClassIds.map(nftClassId =>
        bookshelfStore.fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(
          nftClassId,
          user.value!.evmWallet,
          { isRefresh: true },
        ),
      ),
    )
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBooks()
})

const selectedNFT = ref<BookItem | null>(null)
const isConfirmDialogOpen = ref(false)

function handleBurnClick(item: BookItem) {
  selectedNFT.value = item
  isConfirmDialogOpen.value = true
}

async function confirmBurn() {
  if (!selectedNFT.value) return

  const { nftClassId, nftId, bookTitle } = selectedNFT.value
  isBurning.value = true
  isConfirmDialogOpen.value = false

  try {
    await accountStore.restoreConnection()

    const hash = await burnNFT(nftClassId, nftId)
    await waitForTransactionReceipt($wagmiConfig, {
      hash,
      confirmations: 2,
    })

    toast.add({
      title: $t('burn_page_success_title'),
      description: $t('burn_page_success_description', { book: bookTitle }),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('burn_nft_success', {
      nft_class_id: nftClassId,
      nft_id: nftId,
    })

    // Refresh the book list
    await fetchBooks()
  }
  catch (error) {
    await handleError(error, {
      title: $t('burn_page_error_title'),
    })

    useLogEvent('burn_nft_error', {
      nft_class_id: nftClassId,
      nft_id: nftId,
      error: String(error),
    })
  }
  finally {
    isBurning.value = false
    selectedNFT.value = null
  }
}
</script>
