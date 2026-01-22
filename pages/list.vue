<template>
  <main class="flex flex-col grow px-4 laptop:px-12 pb-4">
    <div class="flex flex-col grow w-full max-w-[1200px] mx-auto">
      <h1
        class="mt-4 laptop:mt-10 mb-6 text-theme-cyan text-xl laptop:text-3xl font-bold"
        v-text="$t('book_list_title')"
      />
      <UCard
        v-if="!hasLoggedIn"
        class="w-full max-w-sm mt-8 mx-auto"
        :ui="{ footer: 'flex justify-end' }"
      >
        <p v-text="$t('book_list_please_login')" />
        <template #footer>
          <LoginButton />
        </template>
      </UCard>
      <div
        v-else-if="bookListStore.count > 0"
        class="relative"
      >
        <header class="sticky top-0 z-10 grid grid-cols-12 items-center py-2 text-muted bg-(--app-bg) leading-none border-b border-black/10">
          <div class="col-span-1">
            <UCheckbox
              :model-value="hasSelectedItems"
              @update:model-value="handleSelectAllUpdate"
            />
          </div>
          <div class="flex items-center justify-between col-start-2 col-span-11">
            <span v-text="$t('book_list_header_item_label')" />

            <UButton
              :label="$t('book_list_checkout_button_label')"
              :loading="isCheckingOut"
              :disabled="!hasSelectedItems"
              @click="handleCheckoutButtonClick"
            />
          </div>
        </header>

        <ul class="divide-y divide-black/10">
          <BookListItem
            v-for="item in bookListStore.items"
            :key="item.nftClassId"
            :nft-class-id="item.nftClassId"
            :price-index="item.priceIndex"
            :is-selected="selectedItemIds.has(getBookListItemId(item.nftClassId, item.priceIndex))"
            @remove="handleBookListItemRemove"
            @select="handleItemSelect"
            @unselect="handleItemDeselect"
          />
        </ul>
      </div>
      <div
        v-else
        class="flex flex-col items-center grow py-12"
      >
        <div class="flex flex-col justify-center items-center gap-2 py-4 grow text-muted">
          <template v-if="bookListStore.isLoading">
            <UIcon
              class="animate-spin"
              name="i-material-symbols-progress-activity"
              size="48"
            />
            <span
              class="font-semibold leading-none"
              v-text="$t('book_list_loading_description')"
            />
          </template>
          <template v-else>
            <UIcon
              name="i-material-symbols-favorite-outline-rounded"
              size="48"
            />
            <span
              class="font-semibold leading-none"
              v-text="$t('book_list_empty_description')"
            />
          </template>
        </div>
        <UButton
          :class="[
            'max-w-[348px]',
            'laptop:mt-12',
            { 'opacity-0 pointer-events-none': bookListStore.isLoading },
          ]"
          leading-icon="i-material-symbols-storefront-outline"
          :label="$t('book_list_empty_cta_button_label')"
          size="xl"
          block
          :to="localeRoute({ name: 'store' })"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { UCheckbox } from '#components'

const { t: $t, locale } = useI18n()
const localeRoute = useLocaleRoute()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const bookListStore = useBookListStore()
const { handleError } = useErrorHandler()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { getAnalyticsParameters } = useAnalytics()
const { getCheckoutCurrency } = usePaymentCurrency()

useHead({ title: $t('book_list_title') })

const selectedItemIds = ref<Set<string>>(new Set())
const hasSelectedItems = computed(() => selectedItemIds.value.size > 0)

function handleSelectAllUpdate(isSelected: 'indeterminate' | boolean) {
  if (isSelected) {
    selectedItemIds.value = new Set(bookListStore.items.map(item => getBookListItemId(item.nftClassId, item.priceIndex)))
  }
  else {
    selectedItemIds.value.clear()
  }
}

async function handleBookListItemRemove({ nftClassId, priceIndex }: BookListItem) {
  useLogEvent('remove_from_cart', { nftClassId, priceIndex })
  try {
    await bookListStore.removeItem(nftClassId, priceIndex)
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_book_list_remove'),
      logPrefix: 'book_list_remove',
    })
  }
}

const isCheckingOut = ref(false)

async function handleCheckoutButtonClick() {
  if (!bookListStore.count) return
  try {
    isCheckingOut.value = true
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }

    const selectedItems = bookListStore.items
      .filter(
        item => selectedItemIds.value.has(getBookListItemId(item.nftClassId, item.priceIndex)),
      )
      .map(item => ({
        nftClassId: item.nftClassId,
        priceIndex: item.priceIndex,
      }))

    const { url, paymentId } = await likeCoinSessionAPI.createNFTBookCartPurchase(
      selectedItems,
      {
        email: user.value?.email,
        cancelPage: 'list',
        language: locale.value.split('-')[0],
        currency: getCheckoutCurrency(),
        ...getAnalyticsParameters({ utmSource: '3ook-list' }),
      },
    )
    useLogEvent('begin_checkout', { payment_id: paymentId })
    await navigateTo(url, { external: true })
  }
  catch (error) {
    isCheckingOut.value = false
    await handleError(error, {
      title: $t('error_book_list_checkout'),
      logPrefix: 'book_list_checkout',
    })
  }
}

function handleItemSelect({ nftClassId, priceIndex }: BookListItem) {
  selectedItemIds.value.add(getBookListItemId(nftClassId, priceIndex))
  useLogEvent('book_list_item_select', { nftClassId, priceIndex })
}

function handleItemDeselect({ nftClassId, priceIndex }: BookListItem) {
  selectedItemIds.value.delete(getBookListItemId(nftClassId, priceIndex))
  useLogEvent('book_list_item_deselect', { nftClassId, priceIndex })
}

async function fetchBookList() {
  try {
    await bookListStore.loadItems()
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_book_list_load'),
      logPrefix: 'book_list_load',
    })
  }
}

onMounted(async () => {
  useLogEvent('view_cart')
  if (hasLoggedIn.value) {
    await fetchBookList()
  }
})

watch(hasLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    await fetchBookList()
  }
})
</script>
