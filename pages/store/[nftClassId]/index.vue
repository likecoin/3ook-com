<template>
  <main class="items-center px-4 laptop:px-12 pb-[100px]">
    <div
      :class="[
        'z-10',
        'h-[62px]',
        'w-full',
        'max-w-[1200px]',
        'pt-2',

        'flex',
        'items-center',
      ]"
    >
      <UButton
        variant="link"
        color="neutral"
        :ui="{ base: '!px-0' }"
        :label="$t('product_page_back_to_store_label')"
        @click="handleBackButtonClick"
      >
        <template #leading>
          <div class="rounded-full p-1 border-1 border-gray-300 flex items-center justify-center">
            <UIcon
              name="i-material-symbols-arrow-back-rounded"
              class="w-4 h-4"
            />
          </div>
        </template>
      </UButton>
    </div>
    <section class="flex flex-col tablet:flex-row gap-[32px] tablet:gap-[44px] w-full max-w-[1200px]">
      <div class="grow pt-5">
        <AffiliateAlert class="mb-6" />

        <div class="flex flex-col laptop:flex-row gap-6 laptop:gap-8">
          <BookCoverCarousel
            class="w-[150px] tablet:w-[130px] laptop:w-[220px] shrink-0"
            :cover-src="bookCoverSrc"
            :alt="bookName"
            :promotional-images="bookInfo.promotionalImages.value"
            :promotional-videos="bookInfo.promotionalVideos.value"
            :has-shadow="true"
            :nft-class-id="nftClassId"
          />

          <div class="flex flex-col justify-center">
            <h1
              class="text-[24px] text-highlighted laptop:text-[32px] desktop:text-[40px] font-bold leading-[1.2]"
              v-text="bookName"
            />
            <p
              v-if="bookInfo.alternativeHeadline.value"
              class="text-[16px] text-muted laptop:text-[20px] desktop:text-[24px] leading-[1.3] mt-2"
              v-text="bookInfo.alternativeHeadline.value"
            />

            <ul
              :class="[
                'flex',
                'flex-wrap',
                'gap-x-[64px]',
                'gap-y-6',
                'mt-6 tablet:mt-8',
                '[&>li>div:first-child]:text-muted',
                '[&>li>div:first-child]:text-sm',
                '[&>li>div:first-child]:mb-2',
              ]"
            >
              <li v-if="bookInfo.authorName.value">
                <div v-text="$t('product_page_author_name_label')" />
                <EntityItem
                  :name="bookInfo.authorName.value"
                  entity-type="author"
                />
              </li>
              <li v-if="bookInfo.publisherName.value">
                <div v-text="$t('product_page_publisher_label')" />
                <EntityItem
                  :name="bookInfo.publisherName.value"
                  entity-type="publisher"
                />
              </li>
            </ul>
          </div>
        </div>

        <UTabs
          v-if="infoTabItems.length"
          v-model="activeTabValue"
          :items="infoTabItems"
          variant="link"
          class="gap-6 w-full mt-[52px] tablet:mt-[80px]"
          :unmount-on-hide="false"
          :ui="{ list: 'gap-6 border-0', trigger: 'text-lg font-bold pb-0 px-0', indicator: 'border-1 dark:border-theme-cyan' }"
        >
          <template #description>
            <ExpandableContent>
              <div
                class="markdown"
                v-html="bookInfoDescriptionHTML"
              />
            </ExpandableContent>
            <template v-if="bookInfo.descriptionSummary?.value">
              <h3 class="text-lg font-semibold mt-8 mb-4">
                {{ $t('product_page_description_summary_label') }}
              </h3>
              <ExpandableContent>
                <div
                  class="markdown"
                  v-html="bookInfoDescriptionSummaryHTML"
                />
              </ExpandableContent>
            </template>
            <template v-if="bookInfo.bookReviewInfo.value?.url">
              <h3 class="text-lg font-semibold mt-8 mb-4">
                {{ $t('product_page_review_info_label') }}
              </h3>
              <NuxtLink
                :to="bookReviewURLWithUTM"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center text-sm text-primary hover:underline"
                @click="handleBookReviewClick"
              >
                <UIcon
                  name="i-material-symbols-book-outline-rounded"
                  size="16"
                />
                <span class="mx-2">{{ bookInfo.bookReviewInfo.value?.title || $t('product_page_book_review_link_label') }}</span>
                <UIcon
                  name="i-material-symbols-open-in-new-rounded"
                  size="14"
                />
              </NuxtLink>
            </template>
            <ul
              v-if="descriptionTags.length"
              :class="[
                'flex',
                'flex-wrap',
                'gap-x-2',
                'gap-y-4',
                'mt-[48px]',
                { 'max-tablet:hidden': isStakingTabActive },
              ]"
            >
              <li
                v-for="tag in descriptionTags"
                :key="tag"
              >
                <UButton
                  :label="tag"
                  :to="localeRoute({
                    name: 'store',
                    query: {
                      q: tag,
                      ll_medium: `keyword-${tag}`,
                      ll_source: 'product-page',
                    },
                  })"
                  variant="soft"
                  :ui="{ base: 'rounded-full' }"
                  @click="handleKeywordClick(tag)"
                />
              </li>
            </ul>
          </template>

          <template #author>
            <ExpandableContent>
              <div
                class="markdown"
                v-html="authorDescriptionHTML"
              />
            </ExpandableContent>
          </template>

          <template #table-of-contents>
            <ExpandableContent>
              <div
                class="markdown"
                v-html="tableOfContentsHTML"
              />
            </ExpandableContent>
          </template>

          <template #staking-info>
            <div class="max-tablet:hidden space-y-4 text-highlighted">
              <div class="grid grid-cols-1 tablet:grid-cols-3 gap-4">
                <UCard :ui="{ body: 'p-4' }">
                  <div class="text-center">
                    <BalanceLabel
                      class="text-2xl"
                      :value="formattedTotalStake"
                      :is-compact="true"
                    />
                    <div
                      class="mt-1 text-sm text-muted"
                      v-text="$t('staking_total_staked')"
                    />
                  </div>
                </UCard>
                <UCard :ui="{ body: 'p-4' }">
                  <div class="text-center">
                    <div
                      class="text-2xl font-semibold"
                      v-text="numberOfStakers.toLocaleString()"
                    />
                    <div
                      class="mt-1 text-sm text-muted"
                      v-text="$t('staking_total_stakers')"
                    />
                  </div>
                </UCard>
                <UCard
                  v-if="hasLoggedIn"
                  :ui="{ body: 'p-4' }"
                >
                  <div class="text-center">
                    <BalanceLabel
                      class="text-2xl"
                      :value="formattedUserStake"
                      :is-compact="true"
                    />

                    <div
                      class="mt-1 text-sm text-muted"
                      v-text="$t('staking_your_stake')"
                    />
                  </div>
                </UCard>
              </div>

              <div
                v-if="hasLoggedIn && pendingRewards > 0n"
                class="mt-4"
              >
                <UCard :ui="{ body: 'p-4' }">
                  <div class="flex justify-between items-center">
                    <div>
                      <BalanceLabel
                        class="text-2xl"
                        :value="formattedPendingRewards"
                      />
                      <div
                        class="mt-1 text-sm text-muted"
                        v-text="$t('staking_pending_rewards')"
                      />
                    </div>
                    <UButton
                      :label="$t('staking_claim_rewards')"
                      color="primary"
                      variant="outline"
                      :loading="isClaimingRewards"
                      @click="handleClaimRewards"
                    />
                  </div>
                </UCard>
              </div>

              <div class="mt-6">
                <NuxtLink
                  :to="localeRoute({ name: 'about', hash: '#curate-to-earn' })"
                  class="inline-flex items-center gap-1 text-sm hover:underline"
                >
                  <UIcon
                    name="i-material-symbols-help-outline-rounded"
                    size="16"
                  />
                  <span>{{ $t('staking_learn_more') }}</span>
                </NuxtLink>
              </div>
            </div>
          </template>

          <template #buyer-messages>
            <div
              v-for="buyer in buyerMessages"
              :key="buyer.txHash"
              class="p-4"
            >
              <div class="flex flex-col items-start gap-3">
                <div class="flex items-center gap-2">
                  <EntityItem
                    :name="buyer.wallet"
                    :wallet-address="buyer.wallet"
                    :is-link-disabled="true"
                  />
                  <p
                    class="text-dimmed text-xs"
                    v-text="new Date(buyer.timestamp).toLocaleString()"
                  />
                </div>
                <p
                  class="text-highlighted whitespace-pre-wrap break-words"
                  v-text="buyer.message"
                />
              </div>
            </div>
          </template>
        </UTabs>
      </div>

      <div class="relative w-full tablet:max-w-[300px] laptop:max-w-[380px] shrink-0">
        <div class="sticky top-0 flex flex-col gap-4 tablet:pt-5">
          <template v-if="isStakingTabActive">
            <StakingControl
              class="max-tablet:-mt-8"
              :nft-class-id="nftClassId"
            />
          </template>

          <template v-else>
            <div
              v-if="pricingItems.length"
              class="bg-white dark:bg-neutral-900 space-y-6 p-4 pt-6 pb-8 rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]"
            >
              <ul
                ref="pricing"
                class="mt-2 space-y-2"
              >
                <li
                  v-for="(item, index) in pricingItems"
                  :key="item.name"
                >
                  <button
                    :class="[
                      'flex',
                      'items-center',
                      'gap-3',
                      'dark:bg-neutral-800',
                      'hover:bg-muted',
                      'hover:dark:bg-neutral-700/50',
                      'rounded-lg',
                      'w-full',
                      'p-4',
                      'border-2',
                      item.isSelected
                        ? 'border-neutral-900 dark:border-neutral-300'
                        : 'border-neutral-300 dark:border-neutral-700',
                      'transition-[background-color, border-color]',
                      'duration-200',
                      'ease-in-out',
                      { 'cursor-pointer': !item.isSoldOut },
                    ]"
                    @click="handlePricingItemClick(index)"
                  >
                    <div class="relative shrink-0 w-[24px] h-[24px] flex items-center justify-center">
                      <span
                        :class="[
                          'absolute',
                          'w-[20px]',
                          'h-[20px]',
                          item.isSelected ? 'bg-theme-cyan' : 'bg-white dark:bg-black',
                          'rounded-full',
                          'outline',
                          'outline-neutral-300',
                        ]"
                      />
                      <UIcon
                        v-if="item.isSelected"
                        class="absolute text-neutral-900 z-10"
                        name="i-material-symbols-check-circle"
                        size="24"
                      />
                    </div>
                    <div class="grow">
                      <div
                        :class="[
                          'flex',
                          'justify-between',
                          'items-center',
                          'gap-3',
                          item.isSoldOut ? 'text-dimmed' : 'text-highlighted',
                        ]"
                      >
                        <span
                          class="font-semibold text-left"
                          v-text="item.isAutoDeliver ? item.name : $t('product_page_edition_title', { name: item.name })"
                        />
                        <span
                          v-if="item.isSoldOut"
                          class="text-sm font-semibold"
                          v-text="$t('product_page_sold_out_button_label')"
                        />
                        <span
                          v-else
                          class="flex flex-col items-end text-right"
                        >
                          <template v-if="item?.discountedPrice">
                            <span class="flex flex-nowrap items-center text-highlighted font-semibold">
                              <span v-text="item.discountedPrice" />
                              <PlusBadge
                                v-if="isLikerPlus"
                                class="ml-1"
                              />
                            </span>
                            <span class="text-xs text-dimmed line-through">
                              <span v-text="item.originalPrice" />
                            </span>
                          </template>
                          <template v-else>
                            <span
                              class="font-semibold"
                              v-text="item.originalPrice"
                            />
                          </template>
                        </span>
                      </div>
                      <div
                        v-if="item.renderedDescription"
                        class="markdown whitespace-normal text-left mt-2"
                        v-html="item.renderedDescription"
                      />

                      <div class="flex flex-wrap gap-1 mt-3">
                        <UBadge
                          v-for="contentType in bookInfo.contentTypes.value"
                          :key="contentType"
                          :label="contentType.toUpperCase()"
                          variant="outline"
                          color="neutral"
                          size="sm"
                        />

                        <UBadge
                          :label="$t('reading_method_read_online')"
                          variant="outline"
                          color="neutral"
                          size="sm"
                        />

                        <UBadge
                          v-if="bookInfo.isDownloadable.value"
                          :label="$t('reading_method_download_file')"
                          variant="outline"
                          color="neutral"
                          size="sm"
                        />

                        <UBadge
                          v-if="!bookInfo.isAudioHidden.value"
                          :label="$t('product_page_support_tts_label')"
                          variant="outline"
                          color="neutral"
                          size="sm"
                        />
                      </div>
                    </div>
                  </button>
                </li>
              </ul>
              <footer class="flex flex-col mt-6 gap-3">
                <UButton
                  v-if="isUserBookOwner"
                  :label="$t('product_page_read_button_label')"
                  icon="i-material-symbols-auto-stories-outline-rounded"
                  size="xl"
                  color="primary"
                  variant="solid"
                  block
                  @click="handleReadButtonClick"
                />
                <UButton
                  v-bind="checkoutButtonProps"
                  class="cursor-pointer"
                  size="xl"
                  :loading="isPurchasing"
                  :disabled="!canBePurchased"
                  block
                  @click="handlePurchaseButtonClick"
                />
              </footer>
            </div>

            <UButton
              v-else-if="isUserBookOwner"
              class="max-tablet:hidden"
              :label="$t('product_page_read_button_label')"
              icon="i-material-symbols-auto-stories-outline-rounded"
              size="xl"
              color="primary"
              variant="solid"
              block
              @click="handleReadButtonClick"
            />

            <div
              v-if="pricingItems.length"
              class="flex flex-col gap-4"
            >
              <UButton
                class="cursor-pointer"
                :label="isInBookList ? $t('product_page_remove_from_book_list_button_label') : $t('product_page_add_to_book_list_button_label')"
                variant="outline"
                color="primary"
                size="xl"
                :leading-icon="isInBookList ? 'i-material-symbols-favorite-rounded' : 'i-material-symbols-favorite-outline-rounded'"
                :loading="isCheckingBookList || isUpdatingBookList"
                block
                @click="handleBookListButtonClickDebounced"
              />

              <GiftButton
                class="hidden w-full"
                :label="$t('product_page_gift_button_label')"
                @click="handleGiftButtonClick"
              />
            </div>
          </template>

          <ul class="flex justify-center items-center gap-2">
            <li
              v-for="button in socialButtons"
              :key="button.icon"
            >
              <UTooltip
                :delay-duration="0"
                :text="button.label"
              >
                <UButton
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :icon="button.icon"
                  :ui="{ base: 'p-2 rounded-full' }"
                  @click="handleSocialButtonClick(button.key)"
                />
              </UTooltip>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section
      v-if="filteredRecommendedClassIds.length"
      class="w-full max-w-[1200px] mx-auto mt-16 laptop:mt-20"
    >
      <h2
        class="text-theme-cyan text-lg font-bold"
        v-text="$t('product_page_related_books_title')"
      />

      <ul
        :class="[
          ...gridClasses,
          'flex-wrap',
          'flex',
          'mt-6',
        ]"
      >
        <BookstoreItem
          v-for="(classId, index) in filteredRecommendedClassIds"
          :id="classId"
          :key="classId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="classId"
          :lazy="true"
          :ll-medium="'recommendation'"
          :ll-source="nftClassId"
          @open="handleRecommendedBookCoverClick"
        />
      </ul>
    </section>

    <aside
      :class="[
        'fixed',
        'bottom-[56px]',
        'inset-x-0',
        isPricingItemsVisible && !isUserBookOwner ? 'hidden' : 'flex',
        'tablet:hidden',
        'gap-4',
        'justify-between',
        'items-center',
        'mb-safe',
        'px-4',
        'py-3',
        'bg-white dark:bg-(--app-bg)',
        'border-y',
        'border-y-muted',
        'z-10',
      ]"
    >
      <template v-if="isUserBookOwner">
        <UButton
          :label="$t('product_page_read_button_label')"
          icon="i-material-symbols-auto-stories-outline-rounded"
          class="cursor-pointer"
          color="primary"
          size="xl"
          block
          @click="handleReadButtonClick"
        />
      </template>

      <template v-else-if="pricingItems.length">
        <span class="text-theme-cyan">
          <span
            v-if="selectedPricingItem?.discountedPrice"
            class="text-2xl font-semibold"
            v-text="selectedPricingItem?.discountedPrice"
          />
          <PlusBadge
            v-if="selectedPricingItem?.discountedPrice"
            class="ml-1"
          />
          <span
            v-else
            class="text-2xl font-semibold"
            v-text="selectedPricingItem?.originalPrice"
          />
        </span>
        <UButton
          v-bind="checkoutButtonProps"
          class="cursor-pointer max-w-[248px]"
          color="primary"
          size="xl"
          :loading="isPurchasing"
          :disabled="!canBePurchased"
          block
          @click="handleStickyPurchaseButtonClick"
        />
      </template>
    </aside>

    <!-- Reading Format Selection Drawer -->
    <UDrawer
      v-if="isUserBookOwner"
      v-model:open="isReadBookDrawerOpen"
      :direction="isDesktopScreen ? 'top' : 'bottom'"
      :handle="false"
      :ui="{ content: 'max-w-xl mx-auto' }"
    >
      <template #content>
        <UCard
          class="pb-safe"
          :ui="{
            header: 'text-center font-bold',
            root: isDesktopScreen ? 'rounded-t-none' : 'rounded-b-none',
          }"
        >
          <template #header>
            {{ $t('product_page_select_reading_format') }}
          </template>
          <UButton
            v-for="contentURL in bookInfo.sortedContentURLs.value"
            :key="`${contentURL.type}-${contentURL.index}`"
            class="cursor-pointer"
            icon="i-material-symbols-book-5-outline"
            :label="getContentTypeLabel(contentURL.type)"
            variant="link"
            color="neutral"
            size="xl"
            block
            :ui="{ base: 'justify-start' }"
            @click="handleContentURLClick(contentURL)"
          />
        </UCard>
      </template>
    </UDrawer>
  </main>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import MarkdownIt from 'markdown-it'

const likeCoinSessionAPI = useLikeCoinSessionAPI()
const route = useRoute()
const config = useRuntimeConfig()
const isTestnet = !!config.public.isTestnet
const baseURL = config.public.baseURL
const md = new MarkdownIt({
  html: false, // Disable raw HTML to prevent XSS attacks from untrusted markdown input
  linkify: true,
  breaks: true,
})

const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const getRouteParam = useRouteParam()
const getRouteQuery = useRouteQuery()
const { t: $t, locale } = useI18n()
const toast = useToast()
const wipModal = useWIPModal()
const { formatPrice, formatDiscountedPrice } = useCurrency()
const { getCheckoutCurrency } = usePaymentCurrency()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const nftStore = useNFTStore()
const bookstoreStore = useBookstoreStore()
const bookshelfStore = useBookshelfStore()
const { open: openTippingModal } = useTipping()
const {
  isLikerPlus,
  PLUS_BOOK_PURCHASE_DISCOUNT,
  getPlusDiscountRate,
  openUpsellPlusModalIfEligible,
} = useSubscription()

const metadataStore = useMetadataStore()
const bookListStore = useBookListStore()
const { handleError } = useErrorHandler()
const { getAnalyticsParameters } = useAnalytics()

const isDesktopScreen = useDesktopScreen()

const nftClassId = computed(() => getRouteParam('nftClassId'))
const { isOwner: isUserBookOwner } = useUserBookOwnership(nftClassId)
const bookInfo = useBookInfo({ nftClassId })
const {
  generateBookStructuredData,
  generateOGMetaTags,
} = useStructuredData({ nftClassId })

const {
  pendingRewards,
  isClaimingRewards,
  userStake,
  formattedTotalStake,
  formattedUserStake,
  formattedPendingRewards,
  numberOfStakers,
  handleClaimRewards,
  loadStakingData,
} = useNFTClassStakingData(nftClassId)

const router = useRouter()

if (nftClassId.value !== nftClassId.value.toLowerCase()) {
  await navigateTo(localeRoute({
    name: getRouteBaseName(route),
    params: { nftClassId: nftClassId.value.toLowerCase() },
    query: route.query,
  }), { replace: true })
}

const isCacheDisabled = useNoCache()

await callOnce(async () => {
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value, {
      nocache: isCacheDisabled.value,
    })
  }
  catch (error) {
    await handleError(error, {
      isFatal: true,
      customHandlerMap: {
        404: {
          description: $t('product_page_not_found_error'),
        },
        500: {
          description: $t('product_page_fetch_metadata_failed_error'),
        },
      },
      logPrefix: 'Product Page',
    })
  }
})

const {
  evmClassId,
  redirectClassId,
} = bookInfo.bookstoreInfo.value || {}
const newClassId = evmClassId || redirectClassId
if (newClassId && newClassId !== nftClassId.value) {
  await navigateTo(localeRoute({
    name: getRouteBaseName(route),
    params: { nftClassId: newClassId },
    query: route.query,
  }), { replace: true, redirectCode: 301 })
}

const authorStore = useAuthorStore()
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 600 }))

const selectedPricingItemIndex = ref(Number(getRouteQuery('price_index') || 0))
const isInBookList = ref(false)
const isCheckingBookList = ref(false)
const isUpdatingBookList = ref(false)

const from = computed(() => getRouteQuery('from') || undefined)
const coupon = computed(() => getRouteQuery('coupon') || undefined)
const quantity = computed(() => Math.max(parseInt(getRouteQuery('quantity'), 10) || 1, 1))
const isRedirectedFromUpsell = computed(() => getRouteQuery('upsell') === '1')

const descriptionTags = computed(() => {
  const tags: string[] = []

  if (bookInfo.keywords.value) {
    tags.push(...bookInfo.keywords.value)
  }

  const bookFormatValue = $t('product_page_book_format_value')
  if (!bookInfo.keywords.value?.includes('電子書') && !tags.includes(bookFormatValue)) {
    tags.push(bookFormatValue)
  }

  if (bookInfo.contentTypes.value) {
    tags.push(...bookInfo.contentTypes.value.map(type => type.toUpperCase()))
  }

  tags.push($t('reading_method_read_online'))

  if (bookInfo.isDownloadable.value) {
    tags.push($t('reading_method_download_file'))
  }

  if (!bookInfo.isAudioHidden.value) {
    tags.push($t('product_page_support_tts_label'))
  }

  return [...new Set(tags)]
})

const ogTitle = computed(() => {
  const title = bookInfo.name.value
  const subtitle = bookInfo.alternativeHeadline.value
  const author = bookInfo.authorName.value
  const hasEbookTag = descriptionTags.value.includes($t('product_page_book_format_value'))
  const ebookSuffix = hasEbookTag ? ` - ${$t('product_page_book_format_value')}` : ''
  const titleWithSubtitle = subtitle ? `${title}${$t('text_separator_colon')}${subtitle}` : title
  return author ? `${titleWithSubtitle} - ${author}${ebookSuffix}` : `${titleWithSubtitle}${ebookSuffix}`
})
const ogDescription = computed(() => {
  const description = bookInfo.description.value || ''
  return description.length > 200 ? `${description.substring(0, 197)}...` : description
})
const canonicalURL = computed(() => {
  return `${baseURL}${route.path}`
})

const structuredData = computed(() => {
  return generateBookStructuredData({ canonicalURL: canonicalURL.value })
})

const meta = [
  { name: 'description', content: ogDescription.value },
  { property: 'og:title', content: ogTitle.value },
  { property: 'og:description', content: ogDescription.value },
  { property: 'og:image', content: bookInfo.coverSrc.value },
  { property: 'og:url', content: canonicalURL.value },
  ...generateOGMetaTags({ selectedPricingItemIndex: selectedPricingItemIndex.value }),
]

if (bookInfo.isHidden.value || !bookInfo.isApprovedForIndexing.value) {
  meta.push({ name: 'robots', content: 'noindex, nofollow' })
}

useHead(() => ({
  title: ogTitle.value,
  meta,
  link: [
    { rel: 'canonical', href: canonicalURL.value },
    { rel: 'preload', href: bookCoverSrc.value, as: 'image' },
  ],
  script: structuredData.value
    ? [
        { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value) },
      ]
    : [],
}))

const bookInfoDescriptionHTML = computed(() => {
  return md.render(bookInfo.description?.value || '')
})

const bookInfoDescriptionSummaryHTML = computed(() => {
  return md.render(bookInfo.descriptionSummary?.value || '')
})

const tableOfContentsHTML = computed(() => {
  return md.render(bookInfo.tableOfContents?.value || '')
})

const authorDescriptionHTML = computed(() => {
  return md.render(bookInfo.authorDescription?.value || '')
})

const buyerMessages = computed(() => {
  const messages = nftStore.getMessagesByNFTClassId(nftClassId.value)
  if (!messages) return []

  return messages
    .filter(result => result.message)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
})

const infoTabItems = computed(() => {
  const items: TabsItem[] = []

  if (bookInfo.description.value) {
    items.push({
      label: $t('product_page_info_tab_description'),
      slot: 'description',
      value: 'description',
    })
  }

  if (bookInfo.tableOfContents.value) {
    items.push({
      label: $t('product_page_info_tab_table_of_contents'),
      slot: 'table-of-contents',
      value: 'table-of-contents',
    })
  }

  if (bookInfo.authorDescription.value) {
    items.push({
      label: $t('product_page_info_tab_author_description'),
      slot: 'author',
      value: 'author',
    })
  }

  if (!bookInfo.isHidden.value || userStake.value > 0n) {
    items.push({
      label: $t('staking_info_tab_staking_info'),
      slot: 'staking-info',
      value: 'staking-info',
    })
  }

  // [2025-11-27] Temporarily disabled buyer messages feature
  if (isTestnet && buyerMessages.value.length) {
    items.push({
      label: $t('product_page_buyer_messages_tab'),
      slot: 'buyer-messages',
      value: 'buyer-messages',
    })
  }

  return items
})

const activeTabValue = ref(infoTabItems.value[0]?.value || 'description')

const isStakingTabActive = computed(() => {
  return activeTabValue.value === 'staking-info'
})

watch(activeTabValue, (newTabValue) => {
  const tabValue = infoTabItems.value.find(item => item.value === newTabValue)
  if (tabValue) {
    router.replace({ hash: `#${tabValue.slot}` })
  }
})

function initializeTabFromHash() {
  const hash = route.hash.replace('#', '')
  if (hash) {
    const tabItem = infoTabItems.value.find(item => item.value === hash)
    if (tabItem) {
      activeTabValue.value = tabItem.value as string
    }
  }
}

const pricingItemsElement = useTemplateRef<HTMLLIElement>('pricing')
const isPricingItemsVisible = useElementVisibility(pricingItemsElement)

const pricingItems = computed(() => {
  return bookInfo.pricingItems.value.map((item, index) => {
    const shouldShowDiscount = !from.value && isLikerPlus.value && item.price > 0
    return {
      ...item,
      originalPrice: formatPrice(item.price),
      discountedPrice: shouldShowDiscount ? formatDiscountedPrice(item.price, PLUS_BOOK_PURCHASE_DISCOUNT) : null,
      isSelected: index === selectedPricingItemIndex.value,
      renderedDescription: md.render(item.description || ''),
    }
  })
})

const selectedPricingItem = computed(() => {
  return pricingItems.value[selectedPricingItemIndex.value]
})
const priceIndex = computed(() => selectedPricingItem.value?.index || 0)

const bookName = computed(() => bookInfo.name.value)

const bookReviewURLWithUTM = computed(() => {
  const url = bookInfo.bookReviewInfo.value?.url
  if (!url) return ''

  try {
    const urlObj = new URL(url)
    if (!urlObj.searchParams.has('utm_source')) {
      urlObj.searchParams.set('utm_source', 'product-page')
    }
    if (!urlObj.searchParams.has('utm_medium')) {
      urlObj.searchParams.set('utm_medium', 'book-review-link')
    }
    if (!urlObj.searchParams.has('utm_campaign')) {
      urlObj.searchParams.set('utm_campaign', nftClassId.value)
    }
    return urlObj.toString()
  }
  catch {
    return url
  }
})

async function checkBookListStatus() {
  if (!hasLoggedIn.value) {
    isInBookList.value = false
    return
  }

  if (isCheckingBookList.value) return

  isCheckingBookList.value = true
  try {
    isInBookList.value = await bookListStore.checkItemExists(
      nftClassId.value,
      priceIndex.value,
    )
  }
  catch (error) {
    // Silent error
    console.error(error)
  }
  finally {
    isCheckingBookList.value = false
  }
}

const checkBookListStatusDebounced = useDebounceFn(checkBookListStatus, 100)

function handlePricingItemClick(index: number) {
  selectedPricingItemIndex.value = index
}

// Watch for login status and selected pricing item index changes
watch([hasLoggedIn, selectedPricingItemIndex], checkBookListStatusDebounced)

const socialButtons = computed(() => [
  { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded' },
  { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
  { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
  { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
  { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
])

const formattedLogPayload = computed(() => {
  const currency = selectedPricingItem.value?.currency || 'USD'
  const price = selectedPricingItem.value?.price || 0
  return {
    currency,
    value: price * quantity.value,
    items: [{
      id: `${nftClassId.value}-${selectedPricingItemIndex.value}`,
      name: bookName.value,
      price: price,
      currency,
      quantity: quantity.value,
      google_business_vertical: 'retail',
    }],
    promotion_id: coupon.value || (user.value?.isLikerPlus ? 'plus' : undefined),
    promotion_name: coupon.value || (user.value?.isLikerPlus ? 'plus' : undefined),
  }
})

const isSelectedPricingItemSoldOut = computed(() => {
  return !!selectedPricingItem.value?.isSoldOut
})

const canBePurchased = computed(() => {
  return !isSelectedPricingItemSoldOut.value && !isPurchasing.value && bookInfo.isApprovedForSale.value
})

const getContentTypeLabel = useContentTypeLabel()

function handleContentURLClick(contentURL: ContentURL) {
  const firstTokenId = bookshelfStore.getFirstTokenIdByNFTClassId(nftClassId.value)
  if (firstTokenId) {
    openContentURL(contentURL, firstTokenId)
  }
  isReadBookDrawerOpen.value = false
}

const checkoutButtonProps = computed<{
  variant: 'subtle' | 'solid' | 'outline'
  label: string
}>(() => {
  const label = isSelectedPricingItemSoldOut.value
    ? $t('product_page_sold_out_button_label')
    : isUserBookOwner.value
      ? $t('product_page_buy_again_button_label')
      : $t('product_page_checkout_button_label')
  const variant = isSelectedPricingItemSoldOut.value
    ? 'subtle'
    : isUserBookOwner.value
      ? 'outline'
      : 'solid'
  return {
    variant,
    label,
  }
})

const recommendedClassIds = computed(() => {
  const ownedClassIds = authorStore.getOwnedBookClassIds(bookInfo.nftClassOwnerWalletAddress.value)
  const bookstoreRecommendedClassIds = bookInfo.bookstoreInfo.value?.recommendedClassIds || []
  const currentAuthorName = bookInfo.authorName.value

  return ownedClassIds
    .concat(bookstoreRecommendedClassIds)
    .filter(id => id !== nftClassId.value)
    .sort((a, b) => {
      const metadataA = nftStore.getNFTClassMetadataById(a)
      const metadataB = nftStore.getNFTClassMetadataById(b)
      const authorA = typeof metadataA?.author === 'object' ? metadataA?.author?.name : metadataA?.author || ''
      const authorB = typeof metadataB?.author === 'object' ? metadataB?.author?.name : metadataB?.author || ''
      if (authorA === currentAuthorName && authorB !== currentAuthorName) return -1
      if (authorA !== currentAuthorName && authorB === currentAuthorName) return 1
      return 0
    })
    .slice(0, 10)
})

const filteredRecommendedClassIds = computed(() => {
  return recommendedClassIds.value
    .filter((classId) => {
      const bookstoreInfo = bookstoreStore.getBookstoreInfoByNFTClassId(classId)
      return bookstoreInfo !== null && !bookstoreInfo?.isHidden
    })
})

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount: computed(() => filteredRecommendedClassIds.value.length),
  hasMore: false,
})

onMounted(async () => {
  useLogEvent('view_item', formattedLogPayload.value)
  nftStore.lazyFetchMessagesByClassId(nftClassId.value).catch((error) => {
    console.error(`Failed to fetch messages for NFT class ${nftClassId.value}:`, error)
  })
  const ownerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value
  if (ownerWalletAddress) {
    metadataStore.lazyFetchLikerInfoByWalletAddress(ownerWalletAddress).catch((error) => {
      console.error(`Failed to fetch owner liker info for wallet address ${ownerWalletAddress}:`, error)
    })
    authorStore.lazyFetchBookClassByOwnerWallet(ownerWalletAddress).catch((error) => {
      console.error(`Failed to fetch author owned class for wallet address ${ownerWalletAddress}:`, error)
    })
  }
  const selectedPricingItemIndex = getRouteQuery('edition')
  if (selectedPricingItemIndex) {
    handlePurchaseButtonClick()
  }

  checkBookListStatus()
  await loadStakingData()
  initializeTabFromHash()
})

const { copy: copyToClipboard } = useClipboard()

function getShareURL(medium: string) {
  const baseURL = canonicalURL.value
  const url = new URL(baseURL)
  url.searchParams.set('utm_source', medium)
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', 'share')
  if (from.value) {
    url.searchParams.set('from', from.value)
  }
  return url.toString()
}

async function handleSocialButtonClick(key: string) {
  const shareText = bookInfo.authorName.value
    ? $t('product_page_share_text_with_author', { title: bookName.value, author: bookInfo.authorName.value })
    : $t('product_page_share_text', { title: bookName.value })

  useLogEvent('share', {
    method: key,
    item_id: `${nftClassId.value}-${selectedPricingItemIndex.value}`,
  })

  switch (key) {
    case 'copy-links':
      try {
        const shareUrl = getShareURL('copy-link')
        await copyToClipboard(shareUrl)
        toast.add({
          title: $t('copy_link_success'),
          duration: 3000,
          icon: 'i-material-symbols-link-rounded',
          color: 'success',
        })
      }
      catch (error) {
        console.error('Failed to copy link:', error)
        toast.add({
          title: $t('copy_link_failed'),
          icon: 'i-material-symbols-error-circle-rounded',
          duration: 3000,
          color: 'error',
        })
      }
      break
    case 'threads':
      {
        const shareUrl = getShareURL('threads')
        window.open(
          `https://threads.net/intent/post?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      break
    case 'facebook':
      {
        const shareUrl = getShareURL('facebook')
        window.open(
          `https://m.facebook.com/sharer/sharer.php?display=page&u=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      break
    case 'whatsapp':
      {
        const shareUrl = getShareURL('whatsapp')
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      break
    case 'x':
      {
        const shareUrl = getShareURL('x')
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      break
    default:
  }
}

async function handleBookListButtonClick() {
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  if (isUpdatingBookList.value) {
    return // Prevent multiple simultaneous calls
  }

  isUpdatingBookList.value = true

  if (isInBookList.value) {
    // Remove from book list
    useLogEvent('remove_from_cart', formattedLogPayload.value)
    try {
      await bookListStore.removeItem(
        nftClassId.value,
        selectedPricingItem.value?.index || 0,
      )
      isInBookList.value = false
      toast.add({
        title: $t('book_list_item_removed_toast_description'),
        description: bookInfo.name.value,
        icon: 'i-material-symbols-heart-broken',
        color: 'secondary',
      })
    }
    catch (error) {
      await handleError(error, {
        title: $t('error_book_list_remove'),
        logPrefix: 'product_page_book_list_remove',
      })
    }
  }
  else {
    // Add to book list
    useLogEvent('add_to_cart', formattedLogPayload.value)
    try {
      await bookListStore.addItem(
        nftClassId.value,
        selectedPricingItem.value?.index || 0,
      )
      isInBookList.value = true
      toast.add({
        title: $t('book_list_item_added_toast_description'),
        description: bookInfo.name.value,
        icon: 'i-material-symbols-shopping-bag',
        color: 'success',
        actions: [
          {
            label: $t('book_list_added_toast_view_button_label'),
            variant: 'outline',
            onClick: () => {
              navigateTo(localeRoute({ name: 'list' }))
            },
          },
        ],
      })
    }
    catch (error) {
      await handleError(error, {
        title: $t('error_book_list_add'),
        logPrefix: 'product_page_book_list_add',
      })
    }
  }

  isUpdatingBookList.value = false
}

const handleBookListButtonClickDebounced = useDebounceFn(handleBookListButtonClick, 300)

const isPurchasing = ref(false)
const isReadBookDrawerOpen = ref(false)

async function handlePurchaseButtonClick() {
  useLogEvent('add_to_cart', formattedLogPayload.value)
  if (!selectedPricingItem.value) return
  try {
    isPurchasing.value = true
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }
    if (selectedPricingItem.value.price && !isRedirectedFromUpsell.value && !bookInfo.isUpsellDisabled.value) {
      const isStartSubscription = await openUpsellPlusModalIfEligible({
        nftClassId: nftClassId.value,
        bookPrice: selectedPricingItem.value.price,
        selectedPricingItemIndex: selectedPricingItemIndex.value,
        utmSource: 'upsell_plus',
        utmCampaign: `upsell_plus_${nftClassId.value}`,
        utmMedium: 'product_page',
        from: from.value || undefined,
      })
      if (isStartSubscription) return
    }

    let customPrice: number | undefined = undefined

    if (quantity.value === 1 && selectedPricingItem.value.canTip) {
      const tippingResult = await openTippingModal({
        // TODO: Check if classOwner is always the book's publisher
        avatar: bookInfo.publisherName.value ? bookInfo.nftClassOwnerAvatar.value : '',
        displayName: bookInfo.publisherName.value || bookInfo.authorName.value,
      })
      const tippingAmount = tippingResult?.tippingAmount || 0
      if (tippingAmount) {
        customPrice = calculateCustomPrice(tippingAmount, selectedPricingItem.value.price)
        if (getPlusDiscountRate()) {
          customPrice = Math.round(customPrice * (1 / getPlusDiscountRate()) * 100) / 100
        }
      }
    }

    const email = user.value?.email
    const language = locale.value.split('-')[0]

    const { url, paymentId } = await (
      quantity.value > 1
        ? likeCoinSessionAPI.createNFTBookCartPurchase([{
            nftClassId: nftClassId.value,
            priceIndex: priceIndex.value,
            quantity: quantity.value,
          }], {
            email,
            coupon: coupon.value,
            from: from.value,
            language,
            currency: getCheckoutCurrency(),
            ...getAnalyticsParameters(),
          })
        : likeCoinSessionAPI.createNFTBookPurchase({
            nftClassId: nftClassId.value,
            priceIndex: priceIndex.value,
            customPrice,
            email,
            coupon: coupon.value,
            from: from.value,
            language,
            currency: getCheckoutCurrency(),
            ...getAnalyticsParameters(),
          })
    )
    useLogEvent('begin_checkout', {
      ...formattedLogPayload.value,
      transaction_id: paymentId,
    })
    await navigateTo(url, { external: true })
  }
  catch (error) {
    await handleError(error)
  }
  finally {
    isPurchasing.value = false
  }
}

function handleStickyPurchaseButtonClick() {
  useLogEvent('purchase_sticky_button_click', { nft_class_id: nftClassId.value })
  handlePurchaseButtonClick()
}

function handleGiftButtonClick() {
  useLogEvent('gift_button_click', { nft_class_id: nftClassId.value })
  // TODO: Implement gift functionality
  wipModal.open({
    title: $t('product_page_gift_button_label'),
  })
}

function handleRecommendedBookCoverClick(classId: string) {
  useLogEvent('recommend_book_click', {
    nft_class_id: classId,
  })
}

async function handleReadButtonClick() {
  useLogEvent('product_page_read_button_click', { nft_class_id: nftClassId.value })

  try {
    if (!isUserBookOwner.value) {
      throw createError({ data: { description: $t('error_book_not_owned') } })
    }

    const firstTokenId = bookshelfStore.getFirstTokenIdByNFTClassId(nftClassId.value)
    if (!firstTokenId) {
      throw createError({ data: { description: $t('error_book_not_owned') } })
    }

    const contentURLs = bookInfo.contentURLs.value || []
    if (contentURLs.length > 1) {
      isReadBookDrawerOpen.value = true
      return
    }

    const contentURL = contentURLs[0] || bookInfo.defaultContentURL.value
    if (!contentURL) {
      throw createError({ data: { description: $t('error_book_content_url_empty') } })
    }

    openContentURL(contentURL, firstTokenId)
  }
  catch (error) {
    await handleError(error)
  }
}

async function openContentURL(contentURL: ContentURL, nftId: string) {
  const readerRoute = bookInfo.getReaderRoute.value({ nftId, contentURL })
  await navigateTo(readerRoute)
}

function calculateCustomPrice(editionPrice: number, tippingAmount: number | undefined): number {
  const tip = Number(tippingAmount) || 0
  const base = Number(editionPrice) || 0
  return Number((tip + base).toFixed(2))
}

function handleKeywordClick(keyword: string) {
  useLogEvent('keyword_click', { keyword })
}

async function handleBackButtonClick() {
  useLogEvent('product_page_back_button_click')
  await navigateTo(localeRoute({
    name: 'store',
    query: route.query,
  }))
}

function handleBookReviewClick() {
  useLogEvent('book_review_link_click', {
    nft_class_id: nftClassId.value,
  })
}
</script>
