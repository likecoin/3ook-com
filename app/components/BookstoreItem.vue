<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end text-sm text-muted"
  >
    <BookCover
      :src="bookCoverSrc"
      :to="productPageRoute"
      :alt="bookName"
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
          :to="bookInfo.getAuthorPageRoute({
            llMedium: 'author-link',
            llSource: 'bookstore-item',
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
      v-if="!isApp || price === 0"
      class="mt-[0.5lh] text-highlighted"
    >
      <span
        v-if="formattedDiscountPrice"
        v-text="formattedDiscountPrice"
      />
      <span
        :class="{ 'text-xs ml-0.5 text-muted line-through': formattedDiscountPrice }"
        v-text="formattedPrice"
      />
    </div>

    <div v-if="likeRank > 0">
      <NuxtLink
        :to="stakingRoute"
        class="text-xs font-mono"
      >
        #{{ likeRank }}
      </NuxtLink>
    </div>
  </li>
</template>

<script setup lang="ts">
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
  likeRank: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['visible', 'open'])

const { formatPrice, formatDiscountedPrice } = useCurrency()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value || props.bookCoverSrc, { size: 300 }))
const { isLikerPlus, PLUS_BOOK_PURCHASE_DISCOUNT } = useSubscription()
const { isApp } = useAppDetection()

const productPageRoute = computed(() => {
  return bookInfo.getProductPageRoute({
    llMedium: props.llMedium || undefined,
    llSource: props.llSource || undefined,
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

const price = computed(() => props.price || bookInfo.minPrice.value)
// A prop price carries its own per-currency override (the catalog's Airtable min);
// without one we use the catalog's min-tier override. Unmigrated records pass none.
const priceCurrencyOverride = computed(() => (
  props.price ? props.priceOverride : bookInfo.minPricingItem.value?.priceInDecimalByCurrency
))
const formattedPrice = computed(() => formatPrice(price.value, priceCurrencyOverride.value))

const formattedDiscountPrice = computed(() => {
  if (isLikerPlus.value && price.value > 0) {
    return formatDiscountedPrice(price.value, PLUS_BOOK_PURCHASE_DISCOUNT, priceCurrencyOverride.value)
  }
  return null
})

if (!props.lazy) {
  callOnce(`BookstoreItem_${props.nftClassId}`, () => {
    emit('visible', props.nftClassId)
    fetchBookInfo()
  })
}
else {
  useVisibility('lazyLoadTrigger', (visible) => {
    if (visible) {
      emit('visible', props.nftClassId)
      fetchBookInfo()
    }
  })
}

function fetchBookInfo() {
  nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
    console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
  })
  if (bookInfo.nftClassOwnerWalletAddress.value) {
    metadataStore.lazyFetchLikerInfoByWalletAddress(bookInfo.nftClassOwnerWalletAddress.value).catch(() => {
      console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.nftClassOwnerWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
    })
  }
}

function onBookCoverClick() {
  useLogEvent('select_item', {
    items: [{
      item_id: props.nftClassId,
      item_name: bookName.value,
      price: price.value,
      quantity: 1,
    }],
  })
  emit('open', props.nftClassId)
}
</script>
