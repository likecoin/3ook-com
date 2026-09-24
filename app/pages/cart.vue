<template>
  <main class="section-container flex flex-col grow py-4">
    <header class="flex items-center gap-2 laptop:gap-4 mb-6">
      <PillButton
        icon="i-material-symbols-arrow-back-rounded"
        :aria-label="$t('product_page_back_to_store_label')"
        @click="handleBackButtonClick"
      />
      <h1
        class="text-highlighted text-xl laptop:text-3xl font-bold"
        v-text="$t('book_list_title')"
      />
    </header>

    <UCard
      v-if="!hasLoggedIn"
      class="w-full max-w-sm mx-auto"
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
        <div
          v-if="!isApp"
          class="col-span-1"
        >
          <UCheckbox
            :model-value="hasSelectedItems"
            @update:model-value="handleSelectAllUpdate"
          />
        </div>
        <div
          :class="[
            'flex',
            'items-center',
            'justify-between',
            { 'col-span-11': !isApp },
          ]"
        >
          <span v-text="$t('book_list_header_item_label')" />

          <UButton
            v-if="!isApp"
            :label="$t('book_list_checkout_button_label')"
            :loading="isCheckingOut"
            :disabled="!hasSelectedItems"
            @click="handleCheckoutButtonClick"
          />
        </div>
      </header>

      <p
        v-if="hasMixedCheckoutGroups"
        class="py-2 text-sm text-muted"
        v-text="$t('book_list_mixed_product_type_hint')"
      />

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
            name="i-material-symbols-shopping-cart-outline-rounded"
            size="48"
          />
          <span
            class="font-semibold leading-none"
            v-text="$t('book_list_empty_description')"
          />
        </template>
        <UButton
          :class="[
            'mt-6 laptop:mt-12',
            { 'opacity-0 pointer-events-none': bookListStore.isLoading },
          ]"
          leading-icon="i-material-symbols-storefront-outline"
          :label="$t('book_list_empty_cta_button_label')"
          variant="outline"
          color="neutral"
          size="xl"
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
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const bookListStore = useBookListStore()
const queryCache = useQueryCache()
const { handleError } = useErrorHandler()
const bookPurchaseSessionAPI = useBookPurchaseSessionAPI()
const { getAnalyticsParameters } = useAnalytics()
const { getCheckoutCurrency } = usePaymentCurrency()
const { isApp } = useAppDetection()
// The surface that led here, snapshotted before the redirect to Stripe.
const entryLinkTagProperties = useEntryLinkTagProperties()

const pageTitle = computed(() => $t('book_list_title'))
const pageDescription = computed(() => $t('book_list_description'))
const canonicalURL = computed(() => `${runtimeConfig.public.baseURL}${route.path}`)

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: canonicalURL },
    { property: 'og:type', content: 'website' },
  ],
  link: [
    { rel: 'canonical', href: canonicalURL },
  ],
})

async function handleBackButtonClick() {
  useLogEvent('book_list_back_button_click')
  await navigateTo(localeRoute({ name: 'store' }))
}

const selectedItemIds = ref<Set<string>>(new Set())
const hasSelectedItems = computed(() => selectedItemIds.value.size > 0)

// A merch item narrows the checkout session's shippable countries, which would
// geo-block any books alongside it — the API rejects a cart mixing product types
// or merch territory lists, so selection is kept to one checkout group here.
// Undefined until the listing loads: an unread row must not pass as a book.
function getItemCheckoutGroup({ nftClassId }: Pick<BookListItem, 'nftClassId'>): string | undefined {
  const info = getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
  if (!info) return undefined
  const productType = info.productType || 'book'
  if (!getIsShippedProduct(info.productType)) return productType
  return `${productType}:${[...(info.availableTerritories || [])].sort().join(',')}`
}

const selectedCheckoutGroup = computed(() => {
  const selected = bookListStore.items.find(
    item => selectedItemIds.value.has(getBookListItemId(item.nftClassId, item.priceIndex)),
  )
  return selected && getItemCheckoutGroup(selected)
})

const hasMixedCheckoutGroups = computed(() => {
  const [first] = bookListStore.items
  if (!first) return false
  const firstGroup = getItemCheckoutGroup(first)
  return bookListStore.items.some(item => getItemCheckoutGroup(item) !== firstGroup)
})

function handleSelectAllUpdate(isSelected: 'indeterminate' | boolean) {
  if (isSelected) {
    // Extends whatever is already selected, else takes the list's first type —
    // "select all" then reads top-down rather than silently favouring books.
    const [firstItem] = bookListStore.items
    const targetGroup = selectedCheckoutGroup.value
      ?? (firstItem && getItemCheckoutGroup(firstItem))
    const selected = new Set<string>()
    for (const item of bookListStore.items) {
      if (getItemCheckoutGroup(item) !== targetGroup) continue
      selected.add(getBookListItemId(item.nftClassId, item.priceIndex))
    }
    selectedItemIds.value = selected
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

    const { url, paymentId } = await bookPurchaseSessionAPI.createNFTBookCartPurchase(
      selectedItems,
      {
        email: user.value?.email,
        // API only accepts 'list' | 'checkout'
        cancelPage: 'list',
        language: locale.value.split('-')[0],
        currency: getCheckoutCurrency(),
        ...getAnalyticsParameters({ utmSource: '3ook-list' }),
      },
    )
    useLogEvent('begin_checkout', {
      transaction_id: paymentId,
      ...entryLinkTagProperties,
    })
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
  // Switching type replaces the selection rather than refusing the click: the
  // user's latest tap is the clearer statement of what they want to buy.
  if (selectedCheckoutGroup.value && selectedCheckoutGroup.value !== getItemCheckoutGroup({ nftClassId })) {
    selectedItemIds.value.clear()
  }
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
    // Select-all never scrolls, so the per-row lazy fetch would leave unread rows
    // unclassified and let a merch item be selected alongside a book.
    await Promise.allSettled(bookListStore.items.map(
      item => ensureNFTClassAggregatedMetadataThroughCache(queryCache, item.nftClassId),
    ))
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
