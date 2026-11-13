<template>
  <!--
    The chart item is one link wrapping the whole card, so the surface that logs
    the impression is the surface that takes the click. BookCover gets no `to`
    here — a nested NuxtLink would be invalid markup.
  -->
  <li
    v-if="variant === 'chart'"
    ref="lazyLoadTrigger"
    :class="chart.grid"
  >
    <NuxtLink
      :to="productPageRoute"
      :class="[
        'group flex items-center w-full h-full transition-colors',
        chart.card,
        chart.row,
      ]"
      @click="onBookCoverClick"
    >
      <span
        :class="[
          'shrink-0 text-center font-mono font-bold tabular-nums',
          chart.rank,
        ]"
        v-text="rank"
      />

      <BookCover
        :class="['shrink-0', chart.cover]"
        :rounded-class="chart.coverRounded"
        :src="bookCoverSrc"
        :alt="bookName || $t('book_cover_link_label')"
        :lazy="props.lazy"
        :priority="props.priority"
        :has-shadow="chart.tier === 'hero'"
      />

      <span class="min-w-0 flex flex-col gap-0.5 tablet:w-full">
        <span
          :class="[
            'text-highlighted font-semibold line-clamp-2',
            chart.title,
          ]"
          v-text="bookName"
        />
        <span
          v-if="authorName"
          class="text-xs text-toned truncate"
          v-text="authorName"
        />
      </span>
    </NuxtLink>
  </li>

  <li
    v-else
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end text-sm text-muted"
  >
    <BookCover
      :src="bookCoverSrc"
      :to="isLinkDisabled ? undefined : productPageRoute"
      :alt="bookName || $t('book_cover_link_label')"
      :lazy="props.lazy"
      :priority="props.priority"
      :has-shadow="true"
      @click="onBookCoverClick"
    />

    <div class="mt-2 min-h-[3.2lh]">
      <div
        class="laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="bookName"
      />

      <div class="h-lh mt-[0.5lh] truncate leading-none text-xs">
        <NuxtLink
          v-if="authorName"
          :to="bookInfo.getAuthorPageRoute({
            llMedium: 'author-link',
            llSource: 'bookstore-item',
            isLibrary: props.isLibrary,
          })"
          :class="[
            'inline',
            'text-toned hover:text-theme-black',
            'hover:underline',
          ]"
        >{{ authorName }}</NuxtLink>
      </div>
    </div>

    <!-- Price info for store mode -->
    <div
      :class="[
        'flex justify-between mt-[0.5lh] text-highlighted',
        isLikerPlus ? 'items-center' : 'items-end',
      ]"
    >
      <div
        v-if="!isLibrary && (!isApp || price === 0)"
        class="flex flex-col"
      >
        <div>
          <span
            v-if="formattedDiscountPrice"
            v-text="formattedDiscountPrice"
          />
          <span
            :class="{ 'text-xs ml-0.5 text-muted line-through': formattedDiscountPrice }"
            v-text="formattedPrice"
          />
        </div>
        <!--
          Kept for every non-member card so a free book stays level with its row;
          left empty, it moves above the price so the price sits at the bottom.
        -->
        <div
          v-if="!isLikerPlus"
          :class="[
            'flex items-center gap-1 h-lh text-xs text-muted',
            { '-order-1': !formattedPlusMemberPrice },
          ]"
        >
          <template v-if="formattedPlusMemberPrice">
            <span v-text="formattedPlusMemberPrice" />
            <PlusBadge
              role="img"
              aria-label="Plus"
            />
          </template>
        </div>
      </div>

      <!-- The library icon sits on the lowest row of the card: the rank if any, else the price. -->
      <UIcon
        v-if="isPlusReadingIconVisible && likeRank <= 0"
        class="size-4 shrink-0"
        name="i-3ook-com-library-outline-rounded"
        :title="$t('product_page_plus_reading_label')"
      />
    </div>

    <div class="flex items-end justify-between text-xs font-mono h-lh">
      <NuxtLink
        v-if="likeRank > 0"
        :to="stakingRoute"
      >
        #{{ likeRank }}
      </NuxtLink>
      <UIcon
        v-if="isPlusReadingIconVisible && likeRank > 0"
        class="size-4 shrink-0"
        name="i-3ook-com-library-outline-rounded"
        :title="$t('product_page_plus_reading_label')"
      />
    </div>
  </li>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router'
import { formatLikerIdHandle } from '~~/shared/utils/liker-id'

const props = defineProps({
  nftClassId: {
    type: String,
    default: '',
  },
  bookName: {
    type: String,
    default: '',
  },
  bookCoverSrc: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: 0,
  },
  priceOverride: {
    type: Object as PropType<BookPriceInDecimalByCurrency>,
    default: undefined,
  },
  lazy: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Boolean,
    default: false,
  },
  llMedium: {
    type: String,
    default: '',
  },
  llSource: {
    type: String,
    default: '',
  },
  tag: {
    type: String,
    default: '',
  },
  likeRank: {
    type: Number,
    default: 0,
  },
  shouldShowPlusReadingIcon: {
    type: Boolean,
    default: false,
  },
  isLibrary: {
    type: Boolean,
    default: false,
  },
  isLinkDisabled: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String as PropType<'grid' | 'chart'>,
    default: 'grid',
  },
  rank: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['visible', 'open'])

const { formatPrice, formatMemberPrice } = useCurrency()
const queryCache = useQueryCache()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value || props.bookCoverSrc, { size: 300 }))
const { isLikerPlus, PLUS_BOOK_PURCHASE_DISCOUNT } = useSubscription()
const { isApp } = useAppDetection()

const getRouteQuery = useRouteQuery()
const getRouteParam = useRouteParam()
const publisherSubdomainLikerId = usePublisherSubdomainLikerId()

const productPageRoute = computed(() => {
  const query: LocationQueryRaw = {}
  if (props.tag) query.tag = props.tag
  // The subdomain hands book links to the apex as an external navigation, skipping
  // the query middleware that tags the publisher as `from`. An explicit referrer still wins.
  if (publisherSubdomainLikerId) {
    query.from = getRouteQuery('from') || formatLikerIdHandle(publisherSubdomainLikerId)
  }
  return bookInfo.getProductPageRoute({
    llMedium: props.llMedium || undefined,
    llSource: props.llSource || undefined,
    isLibrary: props.isLibrary,
    query,
  })
})
const stakingRoute = computed(() => {
  const route = productPageRoute.value
  if (route?.name) {
    return {
      ...route,
      hash: '#staking-info',
    }
  }
  return undefined
})

const bookName = computed(() => bookInfo.name.value || props.bookName)
const authorName = computed(() => bookInfo.authorName.value)

const chart = computed(() => getLibraryChartItemClasses(props.rank))

const price = computed(() => props.price || bookInfo.minPrice.value)
// A prop price carries its own per-currency override (the catalog's Airtable min);
// without one we use the catalog's min-tier override. Unmigrated records pass none.
const priceCurrencyOverride = computed(() => (
  props.price ? props.priceOverride : bookInfo.minPricingItem.value?.priceInDecimalByCurrency
))
const formattedPrice = computed(() => formatPrice(price.value, priceCurrencyOverride.value))

const isPlusReadingIconVisible = computed(() =>
  props.shouldShowPlusReadingIcon && bookInfo.isPlusReadingEnabled.value,
)

const formattedDiscountPrice = computed(() => {
  if (!isLikerPlus.value || price.value <= 0 || bookInfo.isDisplayOnly.value) return null
  const { plusPrice, plusPriceInDecimalByCurrency } = bookInfo.minPricingItem.value ?? {}
  return formatMemberPrice({
    price: price.value,
    priceInDecimalByCurrency: priceCurrencyOverride.value,
    plusPrice,
    plusPriceInDecimalByCurrency,
    isNonNFT: bookInfo.isNonNFT.value,
  }, PLUS_BOOK_PURCHASE_DISCOUNT)
})

// Non-NFT goods show their own member price only to eligible members.
// A referrer (`from`, publisher storefront or subdomain) may withhold the discount,
// and the grid cannot check that without a fetch, so referred visits get no teaser.
const formattedPlusMemberPrice = computed(() => {
  if (
    isLikerPlus.value
    || getRouteQuery('from')
    || getRouteParam('userId')
    || publisherSubdomainLikerId
    || price.value <= 0
    || bookInfo.isDisplayOnly.value
    || bookInfo.isNonNFT.value
  ) {
    return null
  }
  return formatMemberPrice({
    price: price.value,
    priceInDecimalByCurrency: priceCurrencyOverride.value,
  }, PLUS_BOOK_PURCHASE_DISCOUNT)
})

// An impression is what the reader saw, so it waits for the observer on every
// cover: `lazy` is set from the widest breakpoint's column count, which on a
// phone leaves the last eager items several rows below the fold.
useVisibility('lazyLoadTrigger', (isVisible) => {
  if (!isVisible) return
  emit('visible', props.nftClassId)
  if (props.lazy) fetchBookInfo()
})

// An eager cover still prefetches without waiting to be seen. Keyed for the app
// lifetime, which suits a metadata fetch and would not suit an impression.
if (!props.lazy) callOnce(`BookstoreItem_${props.nftClassId}`, fetchBookInfo)

function fetchBookInfo() {
  ensureNFTClassAggregatedMetadataThroughCache(queryCache, props.nftClassId).catch(() => {
    console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
  })
  if (bookInfo.nftClassOwnerWalletAddress.value) {
    fetchLikerInfoByWalletAddressThroughCache(
      queryCache,
      bookInfo.nftClassOwnerWalletAddress.value,
    ).catch(() => {
      console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.nftClassOwnerWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
    })
  }
}

function onBookCoverClick() {
  // In the library the book is already owned, so opening it to read isn't an
  // ecommerce action — keep the GA4 `select_item` for the store path only.
  if (!props.isLibrary) {
    useLogEvent('select_item', {
      items: [{
        item_id: props.nftClassId,
        item_name: bookName.value,
        price: price.value,
        quantity: 1,
      }],
    })
  }
  emit('open', props.nftClassId)
}
</script>
