<template>
  <main
    :class="[
      'max-tablet:relative',
      'items-center',
      'section-container',
      pricingItems.length > 1 ? 'pb-[152px]' : 'pb-[120px]',
    ]"
  >
    <!-- Main content -->
    <section class="grid tablet:grid-cols-[1fr_300px] laptop:grid-cols-[1fr_380px] gap-x-[44px] w-full">
      <!-- Primary content column -->
      <div class="pt-5">
        <AffiliateAlert class="mb-6" />

        <aside
          v-if="isPlusPromoBannerVisible"
          class="tablet:hidden z-20 w-full max-w-[1280px] bg-(--app-bg) shadow-lg rounded-2xl mb-4"
        >
          <BookPlusPromoAlert
            :title="$t('product_page_plus_promo_title')"
            :description="$t('product_page_plus_promo_description')"
            theme="cyan"
          />
        </aside>

        <UAlert
          v-if="utmCampaignMessage"
          :description="utmCampaignMessage"
          color="secondary"
          variant="subtle"
          :ui="{
            root: 'mb-6 rounded-2xl items-center py-2',
            description: 'font-bold',
          }"
        />

        <UAlert
          v-if="bookInfo.isRegionRestricted.value"
          color="warning"
          variant="subtle"
          icon="i-material-symbols-location-off-rounded"
          :title="$t('product_page_region_restricted_notice')"
          :ui="{ root: 'mb-6 rounded-2xl items-center py-2' }"
        />

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
            <div class="flex items-center gap-2">
              <h1
                class="text-[24px] text-highlighted laptop:text-[32px] desktop:text-[40px] font-bold leading-[1.2]"
                v-text="bookName"
              />
              <UBadge
                v-if="bookInfo.isAdultOnly.value"
                color="error"
                variant="solid"
                size="sm"
                :label="$t('product_page_adult_only_label')"
              />
            </div>
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
                  :is-library="isLibrary"
                />
              </li>
              <li v-if="bookInfo.publisherName.value">
                <div v-text="$t('product_page_publisher_label')" />
                <EntityItem
                  :name="bookInfo.publisherName.value"
                  entity-type="publisher"
                  :is-library="isLibrary"
                />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <UAccordion
        v-if="infoTabItems.length"
        v-model="activeTabValue"
        class="col-start-1 max-laptop:col-span-full gap-6 w-full mt-[52px] tablet:mt-[80px]"
        :items="infoTabItems"
        :unmount-on-hide="false"
        :ui="{
          trigger: 'text-lg font-bold',
          content: '[&>*:last-child]:pb-10',
        }"
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
            v-if="bookInfo.genre.value || descriptionTags.length"
            :class="[
              'flex',
              'flex-wrap',
              'gap-x-2',
              'gap-y-4',
              'mt-[48px]',
              { 'max-tablet:hidden': isStakingTabActive },
            ]"
          >
            <li v-if="bookInfo.genre.value">
              <UButton
                :label="bookInfo.localizedGenre.value"
                :to="localeRoute({
                  name: listingRouteName,
                  query: {
                    genre: bookInfo.genre.value,
                    ll_medium: 'genre',
                    ll_source: 'product-page',
                  },
                })"
                variant="subtle"
                color="neutral"
                :ui="{ base: 'rounded-full' }"
                @click="handleGenreClick"
              />
            </li>
            <li
              v-for="tag in descriptionTags"
              :key="tag"
            >
              <UButton
                :label="tag"
                :to="localeRoute({
                  name: listingRouteName,
                  query: {
                    q: tag,
                    ll_medium: `keyword-${tag}`,
                    ll_source: 'product-page',
                  },
                })"
                variant="subtle"
                color="neutral"
                :ui="{ base: 'rounded-full' }"
                @click="handleKeywordClick(tag)"
              />
            </li>
            <li v-if="!bookInfo.isAudioHidden.value">
              <UButton
                ref="ttsPlusTagUpsell"
                :label="ttsTagLabel"
                :to="ttsTagRoute"
                variant="subtle"
                :color="ttsTagColor"
                :ui="{ base: 'rounded-full' }"
                @click="handleTTSTagClick"
              />
            </li>
            <li v-if="!isLibrary && isPlusReadingEnabled">
              <UButton
                ref="plusReadingTagUpsell"
                :label="plusReadingTagLabel"
                :to="plusReadingTagRoute"
                variant="subtle"
                :color="plusReadingTagColor"
                :ui="{ base: 'rounded-full' }"
                @click="handlePlusReadingTagClick"
              />
            </li>
          </ul>
        </template>

        <template #preview-content>
          <template v-if="hasLoggedIn">
            <ExpandableContent>
              <div
                class="markdown"
                v-html="previewContentHTML"
              />
            </ExpandableContent>
          </template>
          <div
            v-else
            class="flex flex-col items-center gap-4 py-8"
          >
            <p
              class="text-muted"
              v-text="$t('product_page_preview_content_login_prompt')"
            />
            <LoginButton @click="handlePreviewContentLoginClick" />
          </div>
        </template>

        <template #author>
          <ExpandableContent>
            <div
              class="markdown"
              v-html="authorDescriptionHTML"
            />
          </ExpandableContent>
        </template>

        <template #publisher>
          <ExpandableContent>
            <div
              class="markdown"
              v-html="publisherDescriptionHTML"
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
          <ProductStakingInfo :nft-class-id="nftClassId" />
        </template>

        <template #buyer-messages>
          <div
            v-for="buyer in buyerMessages"
            :key="buyer.txHash"
            class="py-4"
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
      </UAccordion>

      <UAlert
        v-if="!bookInfo.isAudioHidden.value && !isLikerPlus && !isApp"
        :description="$t('product_page_tts_plus_explainer')"
        color="neutral"
        variant="outline"
        orientation="horizontal"
        :ui="{
          root: [
            'w-full',
            'mt-4',
            'max-tablet:flex-col',
            'max-tablet:text-center',
            'text-sm',
            'text-muted',
            'bg-transparent',
          ],
        }"
      >
        <template #actions>
          <UButton
            ref="ttsPlusExplainerUpsell"
            :label="$t('product_page_tts_plus_explainer_cta')"
            :to="ttsExplainerRoute"
            trailing-icon="i-material-symbols-arrow-forward-rounded"
            variant="soft"
            color="secondary"
            size="sm"
            @click="handleTTSExplainerClick"
          />
        </template>
      </UAlert>

      <!-- Sticky side panel -->
      <div
        :class="[
          'relative',
          'w-full',
          'max-tablet:mt-6',
          'row-start-2 tablet:row-start-1',
          'tablet:row-end-[9999]',
          'tablet:col-start-2',
        ]"
      >
        <div class="sticky top-0 flex flex-col gap-4 tablet:pt-5">
          <BookPlusPromoAlert
            v-if="isPlusPromoBannerVisible"
            class="max-tablet:hidden"
            theme="cyan"
            :title="$t('product_page_plus_promo_title')"
            :description="$t('product_page_plus_promo_description')"
          />

          <StakingControl
            v-if="isStakingTabActive"
            class="max-tablet:hidden"
            :nft-class-id="nftClassId"
            :is-control-hidden="isApp"
          />

          <div
            :class="[
              'flex',
              { 'tablet:hidden': isStakingTabActive },
              'flex-col',
              'gap-4',
            ]"
          >
            <section
              v-if="(!isLibrary && pricingItems.length) || isUserBookOwner || isPlusReadingCTAVisible"
              ref="pricingSection"
              :class="[
                'bg-white',
                'dark:bg-elevated',
                'flex',
                'flex-col',
                'gap-4',
                'p-4',
                'rounded-lg',
                'shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]',
              ]"
            >
              <ProductPricingSelector
                v-if="pricingItems.length && !isLibrary && !bookInfo.isRegionRestricted.value"
                :items="pricingItems"
                :is-price-hidden="isFreeBorrowOnly"
                :is-liker-plus="isLikerPlus"
                :content-types="bookInfo.contentTypes.value"
                :is-downloadable="bookInfo.isDownloadable.value"
                :is-tts-supported="!bookInfo.isAudioHidden.value"
                :tts-tag-color="ttsTagColor"
                @select="handlePricingItemClick"
              />

              <!-- The desktop card and the mobile sticky bar share one CTA layout. -->
              <ProductActionButtons
                ref="plusReadingCTAUpsell"
                v-bind="productActionButtonProps"
                size="xl"
                @purchase="handlePurchaseButtonClick"
                @book-list="handleBookListButtonClickDebounced"
                @gift="handleGiftButtonClick"
                @read="handleReadButtonClick"
                @plus-read="handlePlusReadButtonClick"
                @preview="handlePreviewButtonClick"
              />
            </section>
          </div>

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
                  :aria-label="button.label"
                  :ui="{ base: 'p-2 rounded-full' }"
                  @click="handleSocialButtonClick(button.key)"
                />
              </UTooltip>
            </li>
          </ul>

          <p
            v-if="!isLibrary && selectedPricingItem && !isSelectedPricingItemFree"
            class="px-4 text-xs text-muted text-center leading-4"
          >
            <span v-text="deliveryRefundNote" />
            <ULink
              class="underline ml-1"
              :href="shippingReturnRefundURL"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('product_page_delivery_refund_note_link') }}</ULink>
          </p>

          <p class="px-4 text-xs text-muted text-center leading-4">
            <ULink
              class="underline cursor-pointer"
              @click="handleReportContentClick"
            >{{ $t('product_page_report_content_button') }}</ULink>
          </p>
        </div>
      </div>
    </section>

    <div
      ref="recommendationSection"
      class="w-full"
    >
      <RecommendedBookGrid
        class="w-full mt-12 laptop:mt-20"
        :title="$t('product_page_related_books_title')"
        :nft-class-ids="filteredRecommendedClassIds"
        :feed="feedRecommendations"
        :ll-source="nftClassId"
        :is-library="isLibrary"
        :max-rows="MAX_RECOMMENDED_ROWS"
      />
    </div>

    <AppFooter
      v-if="!isApp"
      class="mt-auto"
    />

    <!-- Mobile sticky bottom bar -->
    <Transition name="product-sticky-bar">
      <ProductStickyBar
        v-show="!isStickyBarHidden"
        :is-app="isApp"
        :is-library="isLibrary"
        :is-user-book-owner="isUserBookOwner"
        :is-price-hidden="isFreeBorrowOnly"
        :read-button-variant="readButtonVariant"
        :is-liker-plus="isLikerPlus"
        :pricing-items="pricingItems"
        :selected-pricing-item="selectedPricingItem"
        :sticky-edition-dropdown-items="stickyEditionDropdownItems"
        :action-buttons="productActionButtonProps"
        @read="handleReadButtonClick"
        @plus-read="handlePlusReadButtonClick"
        @preview="handlePreviewButtonClick"
        @gift="handleGiftButtonClick"
        @book-list="handleBookListButtonClickDebounced"
        @purchase="handleStickyPurchaseButtonClick"
      />
    </Transition>

    <!-- Gift Book Modal -->
    <GiftBookModal
      v-model="isGiftModalOpen"
      :nft-class-id="nftClassId"
      :price-index="priceIndex"
      :quantity="quantity"
      :coupon="coupon"
      :from="from"
    />

    <!-- Reading Format Selection Drawer -->
    <UDrawer
      v-if="isUserBookOwner || isPlusReadingCTAVisible"
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
import type { AccordionItem } from '@nuxt/ui'
import MarkdownIt from 'markdown-it'
import type { ProductActionButtonsProps } from '~/components/ProductActionButtons.props'
import type { PlusUpsellSlot } from '~~/shared/constants/analytics'

const bookPurchaseSessionAPI = useBookPurchaseSessionAPI()
const route = useRoute()
const config = useRuntimeConfig()
const isTestnet = !!config.public.isTestnet
const baseURL = config.public.baseURL
const md = new MarkdownIt({
  html: false, // Disable raw HTML to prevent XSS attacks from untrusted markdown input
  linkify: true,
  breaks: true,
})
// Descriptions use ~~~ as separators and indented lines for layout, not code
md.disable(['fence', 'code'])

// In app mode, strip all URLs from descriptions:
// - Plain text URLs (https://..., http://...)
// - Markdown links [text](url) → keep text only
function stripURLs(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/https?:\/\/\S+/g, '') // plain URLs
}

const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const getRouteParam = useRouteParam()
const getRouteQuery = useRouteQuery()
const { t: $t, locale } = useI18n()
const { formatPrice, formatDiscountedPrice } = useCurrency()
const { getCheckoutCurrency } = usePaymentCurrency()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const queryCache = useQueryCache()
const bookshelfStore = useBookshelfStore()
const { open: openTippingModal } = useTipping()
const intercom = useIntercom()
const {
  isLikerPlus,
  PLUS_BOOK_PURCHASE_DISCOUNT,
  getPlusDiscountRate,
  openUpsellPlusModalIfEligible,
} = useSubscriptionModal()

const shippingReturnRefundURL = computed(() => getDocsArticleURL('shippingReturnRefund', locale.value))
const deliveryRefundNote = computed(() =>
  selectedPricingItem.value?.isAutoDeliver
    ? $t('product_page_delivery_refund_note_instant')
    : $t('product_page_delivery_refund_note_signed'),
)

const colorMode = useColorMode()
const ttsTagColor = computed(() => colorMode.value === 'dark' ? 'primary' : 'secondary')
const ttsTagLabel = computed(() => $t('product_page_support_tts_label'))
const ttsTagRoute = computed(() =>
  !isTagUpsellEligible.value
    ? localeRoute({
        name: listingRouteName.value,
        query: {
          q: ttsTagLabel.value,
          ll_medium: `keyword-${ttsTagLabel.value}`,
          ll_source: 'product-page',
        },
      })
    : localeRoute({
        name: 'member',
        query: {
          ll_medium: 'tts-plus-tag',
          ll_source: 'product-page',
        },
      }),
)
const ttsExplainerRoute = computed(() => localeRoute({
  name: 'member',
  query: {
    ll_medium: 'tts-plus-explainer',
    ll_source: 'product-page',
  },
}))

const plusReadingTagColor = computed(() => colorMode.value === 'dark' ? 'primary' : 'secondary')
const plusReadingTagLabel = computed(() => $t('product_page_plus_reading_label'))
const plusReadingTagRoute = computed(() =>
  !isTagUpsellEligible.value
    ? localeRoute({
        name: listingRouteName.value,
        query: {
          q: plusReadingTagLabel.value,
          ll_medium: `keyword-${plusReadingTagLabel.value}`,
          ll_source: 'product-page',
        },
      })
    : localeRoute({
        name: 'member',
        query: {
          ll_medium: 'plus-reading-tag',
          ll_source: 'product-page',
        },
      }),
)

const { handleError } = useErrorHandler()
const { ensureLoggedIn } = useLoginGuard()
const { getAnalyticsParameters } = useAnalytics()
const { fetchBookRecommendations } = useBookRecommendations()
// Which surface sent the reader to this book; rides every conversion event below.
const entryLinkTagProperties = useEntryLinkTagProperties()

const isDesktopScreen = useDesktopScreen()
const { isApp } = useAppDetection()

const nftClassId = computed(() => getRouteParam('nftClassId'))
const { isOwner: isUserBookOwner } = useUserBookOwnership(nftClassId)
// The product page renders the owner, so it opts into fetching their profile.
const bookInfo = useBookInfo({ nftClassId, isOwnerInfoEnabled: true })

const isLibrary = computed(() => getRouteBaseName(route) === 'library-nftClassId')
const listingRouteName = computed(() => (isLibrary.value ? 'library' : 'store'))

const isPlusReadingEnabled = bookInfo.isPlusReadingEnabled

// A member who already borrowed this book reads it now, so the CTA shows Read
// instead of Borrow. Gate on the session: plusReadingBookIds is persisted, so a
// stale borrowed id could otherwise flip the CTA after logout or expiry.
const isBookBorrowed = computed(() =>
  hasLoggedIn.value
  && (isLikerPlus.value || bookInfo.isFreeBorrowEnabled.value)
  && bookshelfStore.plusReadingBookIds.includes(nftClassId.value.toLowerCase()),
)

// Non-owners of a Plus-reading book see a CTA: Plus members and free-edition
// borrowers read it directly, other non-Plus users are routed to subscribe.
// Region-restricted books take no new borrows; an existing one keeps its Read.
const isPlusReadingCTAVisible = computed(() =>
  !isUserBookOwner.value
  && isPlusReadingEnabled.value
  && (!bookInfo.isRegionRestricted.value || isBookBorrowed.value),
)
// The tags link members and in-app users to a keyword search instead, so only
// these arms are upsells. Shared with the click handlers below: an impression
// gate that drifts from its click gate silently corrupts the slot's CTR.
const isTagUpsellEligible = computed(() => !isLikerPlus.value && !isApp.value)
const isPlusReadingUpsellEligible = computed(() =>
  !isLikerPlus.value && !bookInfo.isFreeBorrowEnabled.value,
)

// The ref is the whole action block, so also require the borrow button itself.
usePlusUpsellImpression({
  templateRef: 'plusReadingCTAUpsell',
  slot: 'plus-reading-cta',
  source: 'product-page',
  isEligible: () => isPlusReadingUpsellEligible.value && isPlusReadingCTAVisible.value,
})
usePlusUpsellImpression({
  templateRef: 'plusReadingTagUpsell',
  slot: 'plus-reading-tag',
  source: 'product-page',
  isEligible: isTagUpsellEligible,
})
usePlusUpsellImpression({
  templateRef: 'ttsPlusTagUpsell',
  slot: 'tts-plus-tag',
  source: 'product-page',
  isEligible: isTagUpsellEligible,
})
usePlusUpsellImpression({
  templateRef: 'ttsPlusExplainerUpsell',
  slot: 'tts-plus-explainer',
  source: 'product-page',
})

const isFreeBorrowOnly = computed(() =>
  bookInfo.isFreeBorrowEnabled.value
  && bookInfo.pricingItems.value.every(item => item.price === 0),
)

// Store listing with any edition: free books lead with Own for Free, paid with Buy.
// An owned free copy has nothing left to claim, so only Read remains.
const isCheckoutVisible = computed(() =>
  !isLibrary.value
  && pricingItems.value.length > 0
  && !bookInfo.isRegionRestricted.value
  && !(isUserBookOwner.value && isFreeBorrowOnly.value),
)
// Cart and gift only make sense for a priced edition that is still in stock;
// keyed on stock and approval, not canBePurchased, so they don't blink mid-purchase.
const isCartCTAVisible = computed(() =>
  isCheckoutVisible.value && !isFreeBorrowOnly.value && !isSelectedPricingItemSoldOut.value,
)
const isGiftCTAVisible = computed(() => isCartCTAVisible.value && bookInfo.isApprovedForSale.value)
const bookListButtonProps = computed(() => (isInBookList.value
  ? {
      icon: 'i-material-symbols-shopping-cart-rounded',
      label: $t('product_page_remove_from_book_list_button_label'),
    }
  : {
      icon: 'i-material-symbols-add-shopping-cart-rounded',
      label: $t('product_page_add_to_book_list_button_label'),
    }))

// 試閱: non-owners may read the first chapters free when the listing opted in;
// pointless once the reader already holds the whole book (owned or borrowed).
const isPreviewCTAVisible = computed(() =>
  !isUserBookOwner.value
  && !isBookBorrowed.value
  && bookInfo.isPreviewEnabled.value
  && !bookInfo.isRegionRestricted.value
  && !isFreeBorrowOnly.value,
)
// In the library "borrow" is enough; the store spells out where the book comes from.
const plusReadingCTALabel = computed(() => {
  if (isBookBorrowed.value) return $t('product_page_read_button_label')
  if (isLibrary.value) {
    return bookInfo.isFreeBorrowEnabled.value
      ? $t('product_page_borrow_for_free_button_label')
      : $t('product_page_plus_reading_borrow')
  }
  return $t('product_page_borrow_from_library_button_label')
})

// Read is a quiet secondary action for Plus members (outline); non-Plus owners get a prominent solid button instead.
const readButtonVariant = computed(() => (isLikerPlus.value ? 'outline' : 'solid'))
// Borrow demotes to outline whenever buying is the accent action; Read after borrowing is always quiet.
const plusReadingCTAVariant = computed(() =>
  (isBookBorrowed.value || isCheckoutVisible.value ? 'outline' : 'solid'),
)
const plusReadingCTAIcon = computed(() =>
  (isBookBorrowed.value ? undefined : 'i-3ook-com-library-rounded'),
)

const productActionButtonProps = computed<ProductActionButtonsProps>(() => ({
  isLibrary: isLibrary.value,
  isUserBookOwner: isUserBookOwner.value,
  isCheckoutVisible: isCheckoutVisible.value,
  checkoutButtonProps: checkoutButtonProps.value,
  canBePurchased: canBePurchased.value,
  isPurchasing: isPurchasing.value,
  isCartCtaVisible: isCartCTAVisible.value,
  bookListButtonProps: bookListButtonProps.value,
  isBookListLoading: isCheckingBookList.value || isUpdatingBookList.value,
  isGiftCtaVisible: isGiftCTAVisible.value,
  readButtonVariant: readButtonVariant.value,
  isPlusReadingCtaVisible: isPlusReadingCTAVisible.value,
  plusReadingCtaLabel: plusReadingCTALabel.value,
  plusReadingCtaIcon: plusReadingCTAIcon.value,
  plusReadingCtaVariant: plusReadingCTAVariant.value,
  isPreviewCtaVisible: isPreviewCTAVisible.value,
}))
const {
  generateBookStructuredData,
  generateOGMetaTags,
} = useStructuredData({ nftClassId })

const {
  userStake,
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

function handleProductPageError(error: unknown) {
  return handleError(error, {
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

await callOnce(async () => {
  try {
    const data = await ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId.value, {
      nocache: isCacheDisabled.value,
    })
    if (!data.classData && !getNFTClassMetadataByIdFromCache(queryCache, nftClassId.value)) {
      throw createError({ statusCode: 404 })
    }
  }
  catch (error) {
    await handleProductPageError(error)
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

// An unapproved listing must not exist publicly, on either storefront. Read off the
// cache rather than the callOnce result above, which does not re-run on a client-side
// navigation between books.
async function handleWithheldPendingReview() {
  if (!bookInfo.isWithheldPendingReview.value) return
  // A token bypasses the shared caches, so gating the retry on an already-withheld
  // listing keeps it off the hot path for every other book.
  if (user.value?.token) {
    await fetchNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId.value, {
      include: ['bookstore'],
      nocache: true,
      token: user.value.token,
    }).catch(() => { /* stay withheld and 404 below */ })
  }
  if (!bookInfo.isWithheldPendingReview.value) return
  await handleProductPageError(createError({ statusCode: 404 }))
}
await handleWithheldPendingReview()

// The library only serves Plus-reading titles; send the rest to the store.
if (isLibrary.value && !bookInfo.isPlusReadingEnabled.value) {
  await navigateTo(localeRoute({
    name: 'store-nftClassId',
    params: { nftClassId: nftClassId.value },
    query: route.query,
  }), { replace: true })
}

const authorStore = useAuthorStore()
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 600 }))

const selectedPricingItemIndex = ref(Number(getRouteQuery('price_index') || 0))

const from = computed(() => getRouteQuery('from') || undefined)

// When the link affiliate (`?from=@likerId`) has opted in, Plus members keep
// their 20% discount and the affiliate absorbs the cost from their channel share.
const { config: linkAffiliateConfig } = useAffiliateConfig(from)
const willPlusDiscountApply = computed(
  () => isLikerPlus.value
    && (!from.value || !!linkAffiliateConfig.value?.isPlusDiscountAllowed),
)

const utmCampaignMessage = computed(() => {
  switch (getRouteQuery('utm_campaign')) {
    case 'custom-voice-free': return $t('product_page_campaign_custom_voice_free')
    default: return undefined
  }
})
const coupon = computed(() => getRouteQuery('coupon') || undefined)
const quantity = computed(() => Math.max(parseInt(getRouteQuery('quantity'), 10) || 1, 1))
const isRedirectedFromUpsell = computed(() => getRouteQuery('upsell') === '1')

const isPlusPromoBannerVisible = computed(() => {
  return bookInfo.isPlusPromoEnabled.value && !isLikerPlus.value && !isApp.value && !isUserBookOwner.value
})

const descriptionTags = computed(() => {
  const tags: string[] = []

  if (bookInfo.keywords.value) {
    tags.push(...bookInfo.keywords.value)
  }

  if (bookInfo.contentTypes.value) {
    tags.push(...bookInfo.contentTypes.value.map(type => type.toUpperCase()))
  }

  if (!isLibrary.value && bookInfo.isDownloadable.value) {
    tags.push($t('reading_method_download_file'))
  }

  return [...new Set(tags)]
})

const ogTitle = computed(() => {
  const title = bookInfo.name.value
  const subtitle = bookInfo.alternativeHeadline.value
  const author = bookInfo.authorName.value
  const ebookSuffix = ` - ${$t('product_page_book_format_value')}`
  const titleWithSubtitle = subtitle ? `${title}${$t('text_separator_colon')}${subtitle}` : title
  return author ? `${titleWithSubtitle} - ${author}${ebookSuffix}` : `${titleWithSubtitle}${ebookSuffix}`
})
const ogDescription = computed(() => truncateText(bookInfo.description.value, 200))
const canonicalURL = computed(() => {
  // Always canonicalize to the /store URL so the library variant does not create a duplicated content page for search engines.
  const storePath = localeRoute({
    name: 'store-nftClassId',
    params: { nftClassId: nftClassId.value },
  })?.path
  return `${baseURL}${storePath || route.path}`
})

const structuredData = computed(() => {
  return generateBookStructuredData({ canonicalURL: canonicalURL.value })
})

useHead(() => ({
  title: ogTitle.value,
  meta: [
    { name: 'description', content: ogDescription.value },
    { property: 'og:title', content: ogTitle.value },
    { property: 'og:description', content: ogDescription.value },
    { property: 'og:image', content: bookInfo.coverSrc.value },
    { property: 'og:url', content: canonicalURL.value },
    ...generateOGMetaTags({ selectedPricingItemIndex: selectedPricingItemIndex.value }),
    ...(bookInfo.isHidden.value || !bookInfo.isApprovedForIndexing.value
      ? [{ name: 'robots', content: 'noindex, nofollow' }]
      : []),
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
    { rel: 'preload', href: bookCoverSrc.value, as: 'image', key: 'preload-book-cover' },
  ],
  script: structuredData.value
    ? [
        { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value) },
      ]
    : [],
}))

function renderDescription(text: string): string {
  const source = isApp.value ? stripURLs(text) : text
  return md.render(source)
}

const bookInfoDescriptionHTML = computed(() => {
  return renderDescription(bookInfo.description?.value || '')
})

const bookInfoDescriptionSummaryHTML = computed(() => {
  return renderDescription(bookInfo.descriptionSummary?.value || '')
})

const tableOfContentsHTML = computed(() => {
  return renderDescription(bookInfo.tableOfContents?.value || '')
})

const previewContentHTML = computed(() => {
  return renderDescription(bookInfo.previewContent?.value || '')
})

const authorDescriptionHTML = computed(() => {
  return renderDescription(bookInfo.authorDescription?.value || '')
})

const publisherDescriptionHTML = computed(() => {
  return renderDescription(bookInfo.publisherDescription?.value || '')
})

const buyerMessages = computed(() => {
  const messages = getNFTClassMessagesFromCache(queryCache, nftClassId.value)
  if (!messages) return []

  return messages
    .filter(result => result.message)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
})

const infoTabItems = computed(() => {
  const items: AccordionItem[] = []

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

  if (bookInfo.previewContent.value) {
    items.push({
      label: $t('product_page_info_tab_preview_content'),
      slot: 'preview-content',
      value: 'preview-content',
    })
  }

  if (bookInfo.authorDescription.value) {
    items.push({
      label: $t('product_page_info_tab_author_description'),
      slot: 'author',
      value: 'author',
    })
  }

  if (bookInfo.publisherDescription.value) {
    items.push({
      label: $t('product_page_info_tab_publisher_description'),
      slot: 'publisher',
      value: 'publisher',
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
const isTabInitialized = ref(false)

const isStakingTabActive = computed(() => {
  return activeTabValue.value === 'staking-info'
})

watch(activeTabValue, (newTabValue) => {
  const tabValue = infoTabItems.value.find(item => item.value === newTabValue)
  if (tabValue) {
    router.replace({ hash: `#${tabValue.slot}` })
  }
  if (isTabInitialized.value && newTabValue === 'preview-content') {
    useLogEvent('product_page_preview_content_tab_click', { nft_class_id: nftClassId.value })
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

const pricingItems = computed(() => {
  return bookInfo.pricingItems.value
    .filter(item => !isApp.value || item.price === 0)
    .map((item, index) => {
      const shouldShowDiscount = willPlusDiscountApply.value && item.price > 0
      return {
        ...item,
        label: item.isAutoDeliver ? item.name : $t('product_page_edition_title', { name: item.name }),
        originalPrice: formatPrice(item.price, item.priceInDecimalByCurrency),
        discountedPrice: shouldShowDiscount ? formatDiscountedPrice(item.price, PLUS_BOOK_PURCHASE_DISCOUNT, item.priceInDecimalByCurrency) : null,
        isSelected: index === selectedPricingItemIndex.value,
        renderedDescription: renderDescription(item.description || ''),
      }
    })
})

const selectedPricingItem = computed(() => {
  return pricingItems.value[selectedPricingItemIndex.value]
})
const priceIndex = computed(() => selectedPricingItem.value?.index || 0)
const isSelectedPricingItemFree = computed(() => selectedPricingItem.value?.price === 0)

const stickyEditionDropdownItems = computed(() => {
  return pricingItems.value.map((item, index) => ({
    label: item.label,
    disabled: item.isSoldOut,
    onSelect: () => handlePricingItemClick(index),
  }))
})

// Hide the sticky bar while the pricing section or the recommendation section is in view.
// The negative bottom rootMargin ignores the sliver hidden behind the bottom tab bar,
// so a section only counts as visible once it clearly rises above it.
const stickyBarRootMargin = '0px 0px -100px 0px'
const pricingSection = useTemplateRef<HTMLElement>('pricingSection')
const isPricingSectionVisible = useElementVisibility(pricingSection, {
  rootMargin: stickyBarRootMargin,
})
const recommendationSection = useTemplateRef<HTMLElement>('recommendationSection')
const isRecommendationSectionVisible = useElementVisibility(recommendationSection, {
  rootMargin: stickyBarRootMargin,
})
const isStickyBarHidden = computed(() =>
  isPricingSectionVisible.value
  // Guard the empty case: a zero-height wrapper can still count as intersecting
  || (isRecommendationSectionVisible.value && filteredRecommendedClassIds.value.length > 0),
)

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

function handlePricingItemClick(index: number) {
  selectedPricingItemIndex.value = index
}

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
    ...entryLinkTagProperties,
  }
})

const {
  isInBookList,
  isCheckingBookList,
  isUpdatingBookList,
  checkBookListStatus,
  handleBookListButtonClickDebounced,
} = useBookListStatus({
  nftClassId,
  priceIndex,
  bookName,
  getLogPayload: () => formattedLogPayload.value,
})

const { socialButtons, handleSocialButtonClick } = useBookSocialShare({
  nftClassId,
  bookName,
  authorName: bookInfo.authorName,
  canonicalURL,
  from,
  priceIndex,
  selectedPricingItemIndex,
  isLibrary,
})

const isSelectedPricingItemSoldOut = computed(() => {
  return !!selectedPricingItem.value?.isSoldOut
})

const canBePurchased = computed(() => {
  return !isSelectedPricingItemSoldOut.value
    && !isPurchasing.value
    && bookInfo.isApprovedForSale.value
    && !bookInfo.isRegionRestricted.value
})

const getContentTypeLabel = useContentTypeLabel()

function handleContentURLClick(contentURL: ContentURL) {
  if (isUserBookOwner.value) {
    const firstTokenId = bookshelfStore.getFirstTokenIdByNFTClassId(nftClassId.value)
    if (firstTokenId) {
      openContentURL(contentURL, firstTokenId)
    }
  }
  else if (isPlusReadingCTAVisible.value) {
    openContentURL(contentURL)
  }
  isReadBookDrawerOpen.value = false
}

const checkoutButtonProps = computed<{
  variant: 'subtle' | 'solid' | 'outline'
  label: string
}>(() => {
  const isFree = isSelectedPricingItemFree.value
  const label = isSelectedPricingItemSoldOut.value
    ? $t('product_page_sold_out_button_label')
    : isUserBookOwner.value
      ? $t('product_page_buy_again_button_label')
      : isFree
        ? $t('product_page_claim_button_label')
        : $t('product_page_checkout_button_label')
  const variant = isSelectedPricingItemSoldOut.value ? 'subtle' : 'solid'
  return {
    variant,
    label,
  }
})

// Personalized candidates for the related-books section, seeded by this book.
// Fetched client-side for logged-in users only; undefined until it settles and
// empty for guests and errors, either way leaving the section purely editorial.
const feedRecommendations = ref<BookRecommendations>()

function getAuthorNameFromCache(classId: string): string {
  return getBookEntityName(getNFTClassMetadataByIdFromCache(queryCache, classId)?.author)
}

// Cap the section at whole rows: enough books to fill them at the widest grid.
const MAX_RECOMMENDED_ROWS = 2
const MAX_RECOMMENDED_BOOKS = MAX_RECOMMENDED_ROWS * GRID_COLUMN_MAX
const MAX_SAME_AUTHOR_LEAD_BOOKS = 4

const recommendedClassIds = computed(() => {
  const ownedClassIds = authorStore.getOwnedBookClassIds(bookInfo.nftClassOwnerWalletAddress.value)
  const bookstoreRecommendedClassIds = bookInfo.bookstoreInfo.value?.recommendedClassIds || []
  const currentAuthorName = bookInfo.authorName.value

  // Order-preserving partition by author, so the blend below can lead with
  // same-author picks without a comparator or a second metadata pass.
  const sameAuthorClassIds: string[] = []
  const otherClassIds: string[] = []
  for (const id of ownedClassIds.concat(bookstoreRecommendedClassIds)) {
    if (id === nftClassId.value) continue
    const isSameAuthor = !!currentAuthorName && getAuthorNameFromCache(id) === currentAuthorName
    ;(isSameAuthor ? sameAuthorClassIds : otherClassIds).push(id)
  }

  // Deterministic slots: same-author editorial leads first (capped), then
  // personalized candidates in server order, then the remaining editorial picks.
  const seenClassIds = new Set([normalizeNFTClassId(nftClassId.value)])
  const blendedClassIds: string[] = []
  for (const id of [
    ...sameAuthorClassIds.slice(0, MAX_SAME_AUTHOR_LEAD_BOOKS),
    ...(feedRecommendations.value?.nftClassIds ?? []),
    ...sameAuthorClassIds,
    ...otherClassIds,
  ]) {
    const key = normalizeNFTClassId(id)
    if (seenClassIds.has(key)) continue
    seenClassIds.add(key)
    blendedClassIds.push(id)
  }
  return blendedClassIds.slice(0, MAX_RECOMMENDED_BOOKS)
})

const filteredRecommendedClassIds = computed(() => {
  return recommendedClassIds.value
    .filter((classId) => {
      const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, classId)
      if (bookstoreInfo === null) return false
      // Only shows Plus reading enabled titles in the library
      if (isLibrary.value && !bookstoreInfo?.isPlusReadingEnabled) return false
      return true
    })
})

onMounted(async () => {
  // The app hides the store, so send Plus-reading titles to the library.
  if (!isLibrary.value && isApp.value && bookInfo.isPlusReadingEnabled.value) {
    await navigateTo(localeRoute({
      name: 'library-nftClassId',
      params: { nftClassId: nftClassId.value },
      query: route.query,
    }), { replace: true })
    return
  }

  // The metadata fetch runs in callOnce, so it never reruns on the client and
  // never trips lazyFetch's SWR path — nudge it here so a stale flag (試閱, Plus
  // reading) heals and its CTA self-corrects.
  revalidateNFTClassAggregatedMetadata(queryCache, [nftClassId.value])

  // Personalized related books, seeded by this title; empty results (guests,
  // errors) keep the section purely editorial.
  fetchBookRecommendations({
    seed: nftClassId.value,
    limit: MAX_RECOMMENDED_BOOKS,
    isLibrary: isLibrary.value,
  }).then((recommendations) => {
    feedRecommendations.value = recommendations
  })

  useLogEvent('view_item', formattedLogPayload.value)
  fetchNFTClassMessagesThroughCache(queryCache, nftClassId.value).catch((error) => {
    // Absorbed: the tab just stays empty. Warn, not error — console.error is
    // captured as an exception and this failure needs no triage.
    console.warn(`Failed to fetch messages for NFT class ${nftClassId.value}:`, error)
  })
  const ownerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value
  if (ownerWalletAddress) {
    authorStore.lazyFetchBookClassByOwnerWallet(ownerWalletAddress).catch((error) => {
      console.error(`Failed to fetch author owned class for wallet address ${ownerWalletAddress}:`, error)
    })
  }
  const selectedPricingItemIndex = getRouteQuery('edition')
  if (selectedPricingItemIndex) {
    handlePurchaseButtonClick()
  }

  // Refresh borrowed books so the CTA can read for an already-borrowed book.
  if (hasLoggedIn.value && isLikerPlus.value) {
    bookshelfStore.lazyFetchPlusReadingBooks().catch((error) => {
      console.error('Failed to fetch plus reading books:', error)
    })
  }

  checkBookListStatus()
  await loadStakingData()
  initializeTabFromHash()
  await nextTick()
  isTabInitialized.value = true
})

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
    // Free books skip the Plus upsell and proceed to the tipping/donation flow when eligible.
    if (!isSelectedPricingItemFree.value && !isApp.value && !isRedirectedFromUpsell.value && !bookInfo.isUpsellDisabled.value && !bookInfo.isPlusPromoEnabled.value) {
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

    if (!isApp.value && quantity.value === 1 && selectedPricingItem.value.canTip) {
      const tippingResult = await openTippingModal({
        // TODO: Check if classOwner is always the book's publisher
        avatar: bookInfo.publisherName.value ? bookInfo.nftClassOwnerAvatar.value : '',
        displayName: bookInfo.publisherName.value || bookInfo.authorName.value,
      })
      const tippingAmount = tippingResult?.tippingAmount || 0
      if (tippingAmount) {
        customPrice = calculateCustomPrice(tippingAmount, selectedPricingItem.value.price)
        // Only inflate the tip to compensate for the upcoming Plus discount
        // when it will actually apply — otherwise the customer is charged the
        // scaled-up amount with no discount to offset it.
        if (willPlusDiscountApply.value && getPlusDiscountRate()) {
          const scaledTip = Math.round(tippingAmount * (1 / getPlusDiscountRate()) * 100) / 100
          customPrice = Math.round((selectedPricingItem.value.price + scaledTip) * 100) / 100
        }
      }
    }

    const email = user.value?.email
    const language = locale.value.split('-')[0]

    const { url, paymentId } = await (
      quantity.value > 1
        ? bookPurchaseSessionAPI.createNFTBookCartPurchase([{
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
        : bookPurchaseSessionAPI.createNFTBookPurchase({
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
    useLogEvent('checkout_error', {
      nft_class_id: nftClassId.value,
      error_message: getErrorMessage(error),
    })
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

const isGiftModalOpen = ref(false)

function handleGiftButtonClick() {
  useLogEvent('gift_button_click', { nft_class_id: nftClassId.value })
  isGiftModalOpen.value = true
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

// Omitting nftId opens a Plus reading session: the reader fetches the generic
// file, which ebook-cors serves to active Plus subscribers without ownership.
async function openContentURL(contentURL: ContentURL, nftId?: string, { isPreview = false } = {}) {
  const readerRoute = bookInfo.getReaderRoute.value({ nftId, contentURL, isPreview })
  await navigateTo(readerRoute)
}

function logPlusUpsellClick(llMedium: PlusUpsellSlot) {
  useLogPlusUpsell('click', { llMedium, llSource: 'product-page', nftClassId: nftClassId.value })
}

async function handlePlusReadButtonClick() {
  useLogEvent('product_page_plus_reading_button_click', {
    nft_class_id: nftClassId.value,
    is_liker_plus: isLikerPlus.value,
    is_free_borrow_enabled: bookInfo.isFreeBorrowEnabled.value,
    is_borrowed: isBookBorrowed.value,
  })

  // Guests are prompted to log in or register before reaching the membership page.
  if (!await ensureLoggedIn()) return

  // Non-Plus users are routed to the membership page to subscribe, unless the
  // book has a free edition — then they may borrow it without a subscription.
  if (isPlusReadingUpsellEligible.value) {
    // Only this branch is an upsell — the event above also covers Plus members
    // and free borrows, which never reach the membership page.
    logPlusUpsellClick('plus-reading-cta')
    await navigateTo(localeRoute({
      name: 'member',
      query: {
        ll_medium: 'plus-reading-cta',
        ll_source: 'product-page',
      },
    }))
    return
  }

  // Refresh borrowed books so the shelf reflects this borrow after a fresh login.
  bookshelfStore.lazyFetchPlusReadingBooks().catch((error) => {
    console.error('Failed to fetch plus reading books:', error)
  })

  try {
    const contentURLs = bookInfo.contentURLs.value || []
    if (contentURLs.length > 1) {
      isReadBookDrawerOpen.value = true
      return
    }

    const contentURL = contentURLs[0] || bookInfo.defaultContentURL.value
    if (!contentURL) {
      throw createError({ data: { description: $t('error_book_content_url_empty') } })
    }

    await openContentURL(contentURL)
  }
  catch (error) {
    await handleError(error)
  }
}

async function handlePreviewButtonClick() {
  useLogEvent('product_page_preview_button_click', { nft_class_id: nftClassId.value })

  // The preview file variant requires login server-side; prompt guests first.
  if (!await ensureLoggedIn()) return

  try {
    const contentURL = bookInfo.defaultContentURL.value
    if (!contentURL) {
      throw createError({ data: { description: $t('error_book_content_url_empty') } })
    }

    await openContentURL(contentURL, undefined, { isPreview: true })
  }
  catch (error) {
    await handleError(error)
  }
}

function handlePlusReadingTagClick() {
  if (!isTagUpsellEligible.value) {
    handleKeywordClick(plusReadingTagLabel.value)
    return
  }
  useLogEvent('plus_reading_tag_click', { nft_class_id: nftClassId.value })
  logPlusUpsellClick('plus-reading-tag')
}

function calculateCustomPrice(editionPrice: number, tippingAmount: number | undefined): number {
  const tip = Number(tippingAmount) || 0
  const base = Number(editionPrice) || 0
  return Number((tip + base).toFixed(2))
}

function handleGenreClick() {
  useLogEvent('genre_click', { genre: bookInfo.genre.value })
}

function handleKeywordClick(keyword: string) {
  useLogEvent('keyword_click', { keyword })
}

function handleTTSTagClick() {
  if (!isTagUpsellEligible.value) {
    handleKeywordClick(ttsTagLabel.value)
    return
  }
  useLogEvent('tts_plus_tag_click', { nft_class_id: nftClassId.value })
  logPlusUpsellClick('tts-plus-tag')
}

function handleTTSExplainerClick() {
  useLogEvent('tts_plus_explainer_click', { nft_class_id: nftClassId.value })
  logPlusUpsellClick('tts-plus-explainer')
}

function handleBookReviewClick() {
  useLogEvent('book_review_link_click', {
    nft_class_id: nftClassId.value,
  })
}

function handlePreviewContentLoginClick() {
  useLogEvent('product_page_preview_content_login_click', { nft_class_id: nftClassId.value })
}

function handleReportContentClick() {
  const { method } = intercom.showNewMessage(
    $t('product_page_report_content_prefill', {
      bookName: bookName.value || '-',
      bookId: nftClassId.value,
      url: canonicalURL.value,
    }),
    $t('product_page_report_content_email_subject', { bookName: bookName.value || '-' }),
  )
  useLogEvent('product_page_report_content_click', {
    nft_class_id: nftClassId.value,
    method,
  })
}
</script>

<style scoped>
.product-sticky-bar-enter-active,
.product-sticky-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.product-sticky-bar-enter-from,
.product-sticky-bar-leave-to {
  opacity: 0;
  transform: translateX(-0.5rem);
}
</style>
