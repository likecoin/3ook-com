<template>
  <div class="relative">
    <header
      v-if="isHeaderVisible"
      :class="[
        ...(isListingRoute ? ['sticky', 'top-0'] : []),
        'z-1',

        ...(isSearchHeaderVisible ? [] : gridClasses),
        'gap-4',

        'section-container',
        'py-4',

        'bg-linear-to-b from-(--app-bg)/90 to-(--app-bg)/0',
      ]"
    >
      <!-- Search mode header -->
      <div
        v-if="isSearchHeaderVisible"
        class="flex items-center gap-1 phone:gap-2 w-full"
      >
        <PillButton
          :to="localeRoute({ name: listingRouteName })"
          icon="i-material-symbols-close-rounded"
        />

        <!--
        One chip for every publisher identity: the /store/@<id> route, ?affiliate=
        and ?owner_wallet= all resolve to the same shape in useStoreSearchMode.
        -->
        <div
          v-if="storeEntity"
          class="flex items-center min-w-0 ring-inset ring-2 ring-theme-black dark:ring-muted bg-(--app-bg) rounded-full"
        >
          <UAvatar
            :src="storeEntity.avatarSrc"
            :alt="storeEntity.displayName"
            icon="i-material-symbols-person-2-rounded"
            :ui="{ root: 'size-8 tablet:size-9 border border-2 border-theme-black dark:border-muted' }"
          />
          <div class="flex flex-col justify-center min-w-0 pt-0.5 pl-2 pr-4">
            <span
              class="text-[0.625rem] tablet:text-xs text-muted uppercase tracking-wide leading-none"
              v-text="storeEntity.titlePrefix"
            />
            <h1
              class="-mt-1 font-bold text-sm tablet:text-default truncate"
              v-text="storeEntity.displayName"
            />
          </div>
        </div>
        <h1 v-else-if="searchModeContext">
          <PillButton
            is-active
            is-static
            :label="`${searchModeContext.titlePrefix}${searchModeContext.label}`"
          />
        </h1>
      </div>

      <!-- Tag selector -->
      <div
        v-else
        class="flex items-center gap-1 phone:gap-2 w-full col-span-full"
      >
        <Transition
          :name="isProductRoute ? 'store-header-logo-forward' : 'store-header-logo-back'"
          mode="out-in"
        >
          <PillButton
            v-if="isProductRoute"
            key="back"
            icon="i-material-symbols-arrow-back-rounded"
            :aria-label="isLibraryTab ? $t('product_page_back_to_library_label') : $t('product_page_back_to_store_label')"
            @click="handleBackButtonClick"
          />

          <UButton
            v-else-if="isListingRoute && !isApp && !isLibraryTab"
            key="logo"
            :to="isDefaultTagId
              ? localeRoute({ name: 'about', query: { ll_medium: 'about-logo' } })
              : localeRoute({ name: listingRouteName })"
            variant="link"
            :ui="{
              base: ['shrink-0', 'p-0 sm:p-0'],
            }"
            :title="'3ook.com'"
            @click="handleLogoClick"
          >
            <img
              src="/logo.svg"
              alt="3ook.com"
              class="size-8 laptop:size-9 block"
            >
          </UButton>

          <UButton
            v-else-if="isListingRoute && !isApp && isLibraryTab"
            key="library-logo"
            :to="isDefaultTagId
              ? localeRoute({ name: 'about', hash: '#library', query: { ll_medium: 'about-logo' } })
              : localeRoute({ name: listingRouteName })"
            variant="link"
            icon="i-3ook-com-library-rounded"
            color="neutral"
            :ui="{
              base: ['shrink-0', 'p-0 sm:p-0'],
              leadingIcon: ['size-8', 'text-highlighted'],
            }"
            :title="$t('library_tab_title')"
            :aria-label="$t('library_tab_title')"
            @click="handleLibraryLogoClick"
          />
        </Transition>

        <PillButtonGroup
          :model-value="tagId"
          :items="allTagItems"
          :aria-label="$t('store_tag_more_categories_label')"
          :is-loading="!hasFetchedCMSTags && isDefaultTagId"
          class="grow min-w-0"
          @click="(item) => handleTagClick(item.value)"
        />

        <StoreSearchModal :is-library-tab="isLibraryTab" />

        <UTooltip
          v-if="!isLibraryTab"
          :text="$t('book_list_title')"
        >
          <UButton
            class="rounded-full p-1"
            icon="i-material-symbols-shopping-cart-outline-rounded"
            :aria-label="$t('book_list_title')"
            :to="localeRoute({ name: 'cart' })"
            color="neutral"
            size="lg"
            variant="ghost"
            :ui="{ leadingIcon: 'size-6 sm:size-7' }"
            @click="handleBookListTagClick"
          />
        </UTooltip>
      </div>
    </header>

    <NuxtPage class="flex flex-col grow" />
  </div>
</template>

<script setup lang="ts">
import type { StoreListingRouteName } from '~~/shared/constants/store-routes'
import { STORE_LISTING_ROUTE_NAMES, STORE_PUBLISHER_ROUTE_NAMES } from '~~/shared/constants/store-routes'

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseNameString = useRouteBaseNameString()
const queryCache = useQueryCache()
const { isApp } = useAppDetection()
const { handleError } = useErrorHandler()
const isOnline = useOnline()
const { dismissStoreIntroBanner } = useStoreIntroBanner()
const { dismissLibraryIntroBanner } = useLibraryIntroBanner()

// /store and /library share this parent; the route name selects the mode.
const routeName = computed(() => getRouteBaseNameString() || 'store')
// The publisher route (/store/@<id>) is a listing too — it renders the same
// grid, just scoped to one profile.
const isListingRoute = computed(() => (
  STORE_LISTING_ROUTE_NAMES.includes(routeName.value as StoreListingRouteName)
  || STORE_PUBLISHER_ROUTE_NAMES.includes(routeName.value)
))
const isProductRoute = computed(() =>
  ['store-nftClassId', 'library-nftClassId', 'store-nftClassId-nftId'].includes(routeName.value))
// The claim page nests here too but keeps its own chrome.
const isHeaderVisible = computed(() => isListingRoute.value || isProductRoute.value)
const isLibraryTab = computed(() => routeName.value.startsWith('library'))
const listingRouteName = computed(() => (isLibraryTab.value ? 'library' : 'store'))

// /store and /library are separate route records, so switching tabs remounts
// this parent and the setup-time name resolution stays correct.
const storePageState = useStorePageState(listingRouteName.value)

const {
  isSearchMode,
  storeEntity,
  searchModeContext,
} = await useStoreSearchMode()

const isSearchHeaderVisible = computed(() => isListingRoute.value && isSearchMode.value)

// The tag routes always target the listing route, so a tag click on a product
// page lands back on /store or /library. Product pages highlight only an
// explicit ?tag= and drop their own query params on tag navigation.
const {
  tagId,
  isDefaultTagId,
  getIsLocalHistoriesTagId,
  allTagItems,
} = useStoreTags({
  routeName: listingRouteName,
  isLibraryTab,
  shouldFallbackToDefaultTag: isListingRoute,
  shouldPreserveQuery: isListingRoute,
})

const hasFetchedCMSTags = computed(() => getHasFetchedBookstoreCMSTagsFromCache(queryCache))

// The header pills only need the grid's column classes, which don't depend on item counts,
// so this instance matches the listing body's grid exactly.
const { gridClasses } = usePaginatedGrid({})

async function handleTagClick(tagValue?: string) {
  if (!tagValue || (isListingRoute.value && tagValue === tagId.value)) {
    return
  }

  // Engaging with a category means the intro has served its purpose.
  if (isLibraryTab.value) dismissLibraryIntroBanner()
  else dismissStoreIntroBanner()

  useLogEvent(isLibraryTab.value ? 'library_tag_click' : 'store_tag_click', { tag_id: tagValue })

  if (getIsLocalHistoriesTagId(tagValue)) {
    await navigateTo(localeRoute({ name: 'local-histories' }))
    return
  }

  // From a product page an explicit tag choice must beat the listing's restoreIfNeeded,
  // which would re-apply the saved tag when the chosen (default) tag is absent from the query.
  if (isProductRoute.value) storePageState.clear()
  tagId.value = tagValue
}

async function handleBookListTagClick() {
  useLogEvent('store_tag_book_list_click')
}

async function handleLogoClick() {
  if (isDefaultTagId.value) {
    useLogEvent('store_about_logo_click')
  }
  else {
    useLogEvent('store_logo_click')
    storePageState.clear()
  }
}

async function handleLibraryLogoClick() {
  if (isDefaultTagId.value) {
    useLogEvent('library_about_logo_click')
  }
  else {
    useLogEvent('library_logo_click')
    storePageState.clear()
  }
}

async function handleBackButtonClick() {
  useLogEvent('product_page_back_button_click')
  await navigateTo(localeRoute({
    name: listingRouteName.value,
    query: route.query,
  }))
}

onMounted(async () => {
  // The header owns the tag pills, so it owns the fetch; the claim page hides the header and never needs it.
  if (!isHeaderVisible.value) return
  try {
    await fetchBookstoreCMSTagsThroughCache(queryCache)
  }
  catch (error) {
    // Offline cold launch fails these network fetches expectedly;
    // the cached shell still renders, so don't surface a blocking error modal.
    if (!isOnline.value) return
    // Product pages degrade to a shorter pill row instead of blocking the book.
    if (!isListingRoute.value) {
      console.warn('[store] Failed to fetch CMS tags for header:', error)
      return
    }
    await handleError(error, {
      title: $t('store_fetch_tags_error'),
    })
  }
})
</script>
